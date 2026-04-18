import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CheckCircle2, AlertCircle, Loader2, Clock, LogIn, LogOut, ScanFace, X, Users, SwitchCamera, MapPin, MapPinOff, RefreshCw } from 'lucide-react';
import { loadFaceModels, detectAllFaces, findBestMatch, arrayToDescriptor, ProviderDescriptor } from '../services/faceService';
import { getFaceDescriptors, saveAttendance, saveAuditLog } from '../services/supabaseService';
import { Provider, AttendanceRecord, AuditLog } from '../types';

const mergeImages = (url1: string, url2: string): Promise<string> => {
  return new Promise((resolve) => {
    const img1 = new Image();
    const img2 = new Image();
    img1.crossOrigin = 'Anonymous';
    
    let loaded = 0;
    const onload = () => {
      loaded++;
      if (loaded === 2) {
        const canvas = document.createElement('canvas');
        canvas.width = img1.width + img2.width;
        canvas.height = Math.max(img1.height, img2.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img1, 0, 0);
          ctx.drawImage(img2, img1.width, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else resolve(url2);
      }
    };
    img1.onload = onload;
    img2.onload = onload;
    img1.onerror = () => { loaded++; if(loaded===2) resolve(url2); };
    img2.onerror = () => { loaded++; if(loaded===2) resolve(url2); };
    
    img1.src = url1;
    img2.src = url2;
  });
};

interface Props {
  providers: Provider[];
  attendance: AttendanceRecord[];
  currentUser: string;
  onAttendanceUpdated: () => void;
  setNotification: (message: string, type: 'success' | 'error') => void;
}

type ScreenStatus = 'loading' | 'no-faces-registered' | 'idle' | 'scanning' | 'match-found' | 'no-match' | 'saving' | 'confirmed';

const FaceCheckIn: React.FC<Props> = ({ providers, attendance, currentUser, onAttendanceUpdated, setNotification }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<ScreenStatus>('loading');
  const statusRef = useRef<ScreenStatus>(status);
  
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const [loadingMessage, setLoadingMessage] = useState('Inicializando câmera...');
  const [providerDescriptors, setProviderDescriptors] = useState<ProviderDescriptor[]>([]);
  const [matchedProvider, setMatchedProvider] = useState<{ providerId: string; providerName: string; providerPhoto?: string; distance: number } | null>(null);
  const [matchScore, setMatchScore] = useState(0);
  const noMatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [gpsError, setGpsError] = useState<'permission' | 'unavailable' | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const gpsPositionRef = useRef<GeolocationPosition | null>(null);
  const gpsWatchIdsRef = useRef<number[]>([]);
  const pendingRegisterType = useRef<'entrada' | 'saida' | null>(null);

  // GPS inicia ao montar o componente (antes de qualquer detecção de rosto).
  // 3 métodos em paralelo — o mais rápido capta em ~0.2s via Wi-Fi/rede.
  // Quando o usuário clicar em Registrar, a posição já está armazenada.
  useEffect(() => {
    if (!navigator.geolocation) return;

    const onPos = (pos: GeolocationPosition) => {
      if (!gpsPositionRef.current || pos.coords.accuracy < gpsPositionRef.current.coords.accuracy) {
        gpsPositionRef.current = pos;
        setGpsAccuracy(Math.round(pos.coords.accuracy));
      }
    };
    const onErr = (err: GeolocationPositionError) => {
      if (err.code === 1) setGpsError('permission');
    };

    // Método 1: Wi-Fi/rede — capta em ~0.2s
    gpsWatchIdsRef.current.push(
      navigator.geolocation.watchPosition(onPos, onErr,
        { enableHighAccuracy: false, maximumAge: 0, timeout: 15000 })
    );
    // Método 2: GPS chip — refina precisão continuamente
    gpsWatchIdsRef.current.push(
      navigator.geolocation.watchPosition(onPos, onErr,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
    );
    // Método 3: getCurrentPosition como terceira via
    navigator.geolocation.getCurrentPosition(onPos, onErr,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });

    return () => {
      gpsWatchIdsRef.current.forEach(id => navigator.geolocation.clearWatch(id));
      gpsWatchIdsRef.current = [];
    };
  }, []); // Deps vazias: executa uma vez ao montar, GPS ativo durante toda a sessão


  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('scanning');
    } catch (err: any) {
      setLoadingMessage(`Erro ao abrir a câmera: ${err.message}`);
      setStatus('loading');
    }
  }, []);

  const startScanning = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || providerDescriptors.length === 0) return;
      if (['match-found', 'saving', 'confirmed'].includes(statusRef.current)) {
        clearInterval(scanIntervalRef.current!);
        return;
      }

      try {
        const detections = await detectAllFaces(videoRef.current);
        
        // Bloqueia redefinições assíncronas caso já tenhamos encontrado um rosto!
        if (['match-found', 'saving', 'confirmed'].includes(statusRef.current)) {
          clearInterval(scanIntervalRef.current!);
          return;
        }

        if (detections.length === 0) {
          setStatus(prev => (prev === 'scanning' || prev === 'no-match') ? 'scanning' : prev);
          return;
        }

        for (const detection of detections) {
          const match = findBestMatch(detection.descriptor, providerDescriptors);
          if (match) {
            clearInterval(scanIntervalRef.current!);
            if (videoRef.current) videoRef.current.pause();
            setMatchedProvider(match);
            setMatchScore(Math.round((1 - match.distance) * 100));
            setStatus('match-found');
            return;
          }
        }
        
        setStatus(prev => prev === 'scanning' ? 'no-match' : prev);
        if (noMatchTimeoutRef.current) clearTimeout(noMatchTimeoutRef.current);
        noMatchTimeoutRef.current = setTimeout(() => {
          setStatus(prev => prev === 'no-match' ? 'scanning' : prev);
        }, 3000);
      } catch { /* silently continue */ }
    }, 400);
  }, [providerDescriptors]);

  useEffect(() => {
    const init = async () => {
      try {
        // Dispara a câmera imediatamente para melhorar a responsividade
        startCamera(facingMode).catch(console.error);

        // Paraleliza os uploads pesados (modelos TensorFlow e Supabase)
        const [_, rawDescriptors] = await Promise.all([
          loadFaceModels(),
          getFaceDescriptors()
        ]);

        if (rawDescriptors.length === 0) {
          setStatus('no-faces-registered');
          stopCamera();
          return;
        }

        const descriptors: ProviderDescriptor[] = rawDescriptors.map(d => {
          const provider = providers.find(p => p.id === d.provider_id);
          return {
            providerId: d.provider_id,
            providerName: provider?.name || 'Prestador',
            providerPhoto: provider?.profilePhoto,
            descriptor: arrayToDescriptor(d.descriptor),
          };
        });
        setProviderDescriptors(descriptors);

        // Se a câmera já iniciou com sucesso antes da IA carregar, status já é 'scanning'.
        // Se ela falhou ou demorou muito, garantimos que continuará tentando escanear (que tentará carregar câmera novamente se não houver).
        setStatus(prev => prev === 'loading' ? 'scanning' : prev);
      } catch (err: any) {
        setLoadingMessage(`Erro ao configurar IA: ${err.message}`);
        setStatus('loading');
      }
    };

    init();
    return () => {
      stopCamera();
      if (noMatchTimeoutRef.current) clearTimeout(noMatchTimeoutRef.current);
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === 'scanning' && providerDescriptors.length > 0) {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      startScanning();
    }
  }, [status, providerDescriptors]);

  const getProviderTodayState = (providerId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendance
      .filter(a => a.providerId === providerId && a.date === today)
      .sort((a, b) => a.entryTime.localeCompare(b.entryTime));
    
    // An open entry is a record with entryTime but no exitTime
    const openEntry = todayRecords.find(a => !a.exitTime);
    return { hasOpenEntry: !!openEntry, lastRecord: todayRecords.length ? todayRecords[todayRecords.length - 1] : null };
  };

  const handleRegister = async (type: 'entrada' | 'saida') => {
    if (!matchedProvider) return;
    setStatus('saving');

    try {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = now.toISOString().split('T')[0];

      const todayRecords = attendance
        .filter(a => a.providerId === matchedProvider.providerId && a.date === today && !a.exitTime)
        .sort((a, b) => a.entryTime.localeCompare(b.entryTime));

      let lat = "";
      let lng = "";
      let accuracyUsed = 0;

      // GPS já está rodando desde o mount do componente.
      // A posição capturada (~0.2s após abrir a tela) está sempre disponível aqui.
      const pos = gpsPositionRef.current;
      if (pos) {
        lat = pos.coords.latitude.toFixed(6);
        lng = pos.coords.longitude.toFixed(6);
        accuracyUsed = Math.round(pos.coords.accuracy);
      }
      // Se por algum motivo não houver posição (GPS bloqueado pelo SO),
      // o registro continua sem coordenadas — nunca bloqueia o operador.


      // Capture frame for proof
      let photoBase64 = '';
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const timestampStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
          
          // Solid Background for Watermark (Guarantees contrast)
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(0, canvas.height - 110, canvas.width, 110);
          
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;

          // Type and Date
          ctx.font = '900 18px "Inter", sans-serif';
          ctx.fillStyle = type === 'entrada' ? '#4ade80' : '#f87171'; // bright green or red
          ctx.fillText(`${type === 'entrada' ? 'ENTRADA' : 'SAÍDA'}: ${timestampStr}`, canvas.width - 15, canvas.height - 80);
          
          // Operator
          ctx.font = 'bold 12px "Inter", sans-serif';
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(`OPERADOR: ${currentUser.toUpperCase()}`, canvas.width - 15, canvas.height - 50);
          
          // Location + Coords
          ctx.font = 'bold 12px "Inter", sans-serif';
          ctx.fillStyle = '#60a5fa';
          const precisionText = accuracyUsed > 0 && accuracyUsed <= 1000 ? ` / Prec: ±${accuracyUsed}m` : ``;
          ctx.fillText(`📍 GPS (Lat: ${lat}, Lng: ${lng}${precisionText})`, canvas.width - 15, canvas.height - 25);

          photoBase64 = canvas.toDataURL('image/jpeg', 0.85);
        }
      }

      if (type === 'saida') {
        if (!todayRecords.length) {
          throw new Error('Não há uma entrada aberta para registrar saída.');
        }
        const record = todayRecords[0];
        const entryMinutes = parseInt(record.entryTime.split(':')[0]) * 60 + parseInt(record.entryTime.split(':')[1]);
        const exitMinutes = now.getHours() * 60 + now.getMinutes();
        
        let finalAttachment = photoBase64;
        if (record.attachmentData && photoBase64) {
           finalAttachment = await mergeImages(record.attachmentData, photoBase64);
        }

        let existingLocs: any = {};
        try {
           existingLocs = JSON.parse(record.reason || "{}");
        } catch(e) {
           if (record.reason && record.reason.startsWith('LOCATION:')) {
             const [elat, elng] = record.reason.split(':')[1].split(',');
             existingLocs = { entry: { lat: elat, lng: elng } };
           }
        }
        existingLocs.exit = { lat, lng };

        const updatedRecord: AttendanceRecord = {
          ...record,
          exitTime: time,
          durationMinutes: Math.max(0, exitMinutes - entryMinutes),
          attachmentData: finalAttachment || record.attachmentData,
          reason: JSON.stringify(existingLocs)
        };
        await saveAttendance([updatedRecord]);
      } else if (type === 'entrada') {
        if (todayRecords.length) {
          throw new Error('Já existe uma entrada aberta para este prestador hoje.');
        }
        const newRecord: AttendanceRecord = {
          id: `face-${Date.now()}`,
          providerId: matchedProvider.providerId,
          date: today,
          entryTime: time,
          exitTime: '',
          durationMinutes: 0,
          type: 'presence',
          attachmentData: photoBase64,
          reason: JSON.stringify({ entry: { lat, lng } })
        };
        await saveAttendance([newRecord]);
      }

      const log: AuditLog = {
        id: `face-log-${Date.now()}`,
        timestamp: now.toISOString(),
        userName: currentUser || "Sistema Facial",
        action: 'PRESENÇA',
        details: `Check-in Facial de ${type === 'entrada' ? 'Entrada' : 'Saída'} registrado com biometria.`
      };
      await saveAuditLog(matchedProvider.providerId, log);

      setStatus('confirmed');
      setNotification(
        `${type === 'entrada' ? '✅ Entrada' : '✅ Saída'} de ${matchedProvider.providerName} registrada às ${time}`,
        'success'
      );
      onAttendanceUpdated();
    } catch (err: any) {
      setNotification(`Erro ao registrar: ${err.message}`, 'error');
      setStatus('scanning');
      if (videoRef.current) videoRef.current.play();
    }
  };

  const todayState = matchedProvider ? getProviderTodayState(matchedProvider.providerId) : null;
  const today = new Date().toISOString().split('T')[0];
  const historyToday = attendance
    .filter(a => a.date === today)
    .sort((a, b) => b.entryTime.localeCompare(a.entryTime))
    .slice(0, 10);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-1">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/30">
            <ScanFace size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Check-in Facial</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Reconhecimento biométrico</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        {/* Camera panel */}
        <div className="flex-1">
          <div className="relative bg-slate-900 rounded-3xl overflow-hidden aspect-[4/3] max-h-[480px]">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover transition-opacity duration-500 ${status === 'loading' ? 'opacity-0' : 'opacity-100'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              muted
              playsInline
              autoPlay
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: 'none' }} />

            {/* Camera Controls */}
            {status !== 'loading' && status !== 'no-faces-registered' && (
              <button
                onClick={async () => {
                  const newMode = facingMode === 'user' ? 'environment' : 'user';
                  setFacingMode(newMode);
                  stopCamera();
                  setStatus('loading');
                  setLoadingMessage('Trocando câmera...');
                  await startCamera(newMode);
                }}
                className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-full text-white hover:bg-black/70 transition-all border border-white/20 active:scale-95 z-20 shadow-lg"
                title="Trocar Câmera"
              >
                <SwitchCamera size={20} />
              </button>
            )}

            {/* Idle state - waiting to start camera */}
            {status === 'idle' && (
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-6 p-6 z-20">
                <Camera size={64} className="text-blue-500 mb-2" />
                <div className="text-center">
                  <p className="text-white font-black uppercase text-xl mb-2">Sistema Pronto</p>
                  <p className="text-slate-400 text-sm max-w-sm mb-8">
                    Os modelos de reconhecimento facial foram carregados com sucesso. Clique abaixo para iniciar a câmera.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await startCamera(facingMode);
                  }}
                  className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-sm"
                >
                  <Camera size={20} />
                  Iniciar Câmera
                </button>
              </div>
            )}

            {/* Scanning overlay */}
            {status === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner markers */}
                <div className={`absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity ${providerDescriptors.length > 0 ? 'opacity-100' : 'opacity-30'}`}>
                  <div className="border-2 border-blue-400/50 rounded-full w-44 h-44" />
                </div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <span className="text-blue-300 text-[11px] font-black uppercase tracking-widest">
                      {providerDescriptors.length > 0 ? "Escaneando Rostos..." : "Configurando I.A..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* No match */}
            {status === 'no-match' && (
              <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-4">
                <div className="bg-red-900/70 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                  <X size={14} className="text-red-400" />
                  <span className="text-red-300 text-[11px] font-black uppercase">Rosto não cadastrado</span>
                </div>
              </div>
            )}

            {/* Loading state */}
            {status === 'loading' && (
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-4">
                <Loader2 size={40} className="animate-spin text-blue-400" />
                <p className="text-slate-400 text-xs font-bold text-center max-w-xs">{loadingMessage}</p>
              </div>
            )}

            {/* No faces registered */}
            {status === 'no-faces-registered' && (
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-4 p-6">
                <Users size={48} className="text-slate-600" />
                <div className="text-center">
                  <p className="text-white font-black uppercase mb-1">Nenhum rosto cadastrado</p>
                  <p className="text-slate-400 text-xs">Acesse o perfil de cada prestador e clique em "Cadastrar Rosto" para habilitá-los.</p>
                </div>
              </div>
            )}

            {/* Confirmed */}
            {status === 'confirmed' && (
              <div className="absolute inset-0 bg-emerald-900/90 flex flex-col items-center justify-center gap-6 z-30">
                <CheckCircle2 size={72} className="text-emerald-400 animate-bounce" />
                <div className="text-center">
                  <p className="text-white font-black text-2xl uppercase tracking-widest mb-2">Registrado!</p>
                  <p className="text-emerald-200 text-xs font-bold uppercase">Operação concluída com sucesso</p>
                </div>
                <button
                  onClick={() => {
                    setMatchedProvider(null);
                    setStatus('scanning');
                    if (videoRef.current) videoRef.current.play();
                    startScanning();
                  }}
                  className="mt-4 px-8 py-4 bg-white text-emerald-900 font-black rounded-2xl shadow-xl hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-2 uppercase text-sm tracking-widest"
                >
                  <ScanFace size={20} />
                  Novo Registro
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Match panel */}
        <div className={`lg:w-80 ${(status === 'match-found' || status === 'saving') && matchedProvider ? 'fixed inset-0 z-50 p-6 pb-24 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm lg:static lg:p-0 lg:pb-0 lg:bg-transparent lg:block lg:z-auto' : ''}`}>
          {(status === 'match-found' || status === 'saving') && matchedProvider ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 w-full max-w-sm lg:max-w-none animate-in zoom-in-95 duration-300 relative overflow-hidden">

              {/* GPS Error Overlay */}
              {gpsError && (
                <div className="absolute inset-0 bg-white rounded-3xl z-10 flex flex-col p-6">
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                      <MapPinOff size={32} className="text-red-500" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 uppercase text-sm mb-1">
                        {gpsError === 'permission' ? 'Permissão de Localização Negada' : 'GPS Não Encontrado'}
                      </p>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        {gpsError === 'permission'
                          ? 'O navegador bloqueou o acesso à sua localização.'
                          : 'O sistema não conseguiu capturar sua localização em 5 segundos.'}
                      </p>
                    </div>

                    <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left">
                      <p className="text-amber-800 font-black text-[10px] uppercase tracking-widest mb-2">Como ativar:</p>
                      {gpsError === 'permission' ? (
                        <ol className="text-amber-700 text-xs space-y-1 list-decimal list-inside">
                          <li>Toque no ícone 🔒 na barra de endereço do navegador</li>
                          <li>Selecione <strong>"Permissões do site"</strong></li>
                          <li>Em <strong>"Localização"</strong>, selecione <strong>"Permitir"</strong></li>
                          <li>Recarregue a página e tente novamente</li>
                        </ol>
                      ) : (
                        <ol className="text-amber-700 text-xs space-y-1 list-decimal list-inside">
                          <li>Abra as <strong>Configurações</strong> do celular</li>
                          <li>Vá em <strong>Localização</strong> (ou Privacidade → Localização)</li>
                          <li>Certifique-se de que está <strong>ATIVADO</strong></li>
                          <li>Verifique se o modo é <strong>"Alta precisão"</strong> (não "Economia de bateria")</li>
                          <li>Volte aqui e clique em <strong>Tentar Novamente</strong></li>
                        </ol>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      onClick={() => {
                        setGpsError(null);
                        if (pendingRegisterType.current) handleRegister(pendingRegisterType.current);
                      }}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                      <RefreshCw size={16} />
                      Tentar Novamente
                    </button>
                    <button
                      onClick={() => {
                        setGpsError(null);
                        setMatchedProvider(null);
                        setStatus('scanning');
                        if (videoRef.current) videoRef.current.play();
                        startScanning();
                      }}
                      className="text-slate-400 text-[10px] font-black uppercase py-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {/* Provider photo / avatar */}
              <div className="flex flex-col items-center mb-6">
                {matchedProvider.providerPhoto ? (
                  <img src={matchedProvider.providerPhoto} alt={matchedProvider.providerName} className="w-24 h-24 rounded-full object-cover border-4 border-blue-100 mb-3 shadow-lg" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-3 text-3xl font-black text-blue-600">
                    {matchedProvider.providerName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-2">
                  <CheckCircle2 size={12} />
                  Prestador Reconhecido
                </div>
                <h3 className="font-black text-slate-900 text-center uppercase text-sm leading-tight">{matchedProvider.providerName}</h3>
              </div>

              {/* Context message */}
              {todayState?.hasOpenEntry ? (
                <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-xs font-bold bg-amber-50 text-amber-700">
                  <Clock size={14} className="shrink-0" /> Entrada aberta às {todayState.lastRecord?.entryTime}. Registrar Saída?
                </div>
              ) : todayState?.lastRecord ? (
                <div className="flex flex-col p-3 rounded-xl mb-4 text-[11px] font-bold bg-blue-50 border border-blue-100 text-blue-800 gap-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" /> 
                    <span>Saída já registrada hoje às {todayState.lastRecord.exitTime}.</span>
                  </div>
                  <p className="pl-5 text-blue-600/80">Deseja registrar uma nova entrada neste mesmo dia?</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-xs font-bold bg-blue-50 text-blue-700">
                  <Clock size={14} className="shrink-0" /> Nenhum registro hoje. Registrar Entrada?
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                {!todayState?.hasOpenEntry ? (
                  <button
                    onClick={() => { pendingRegisterType.current = 'entrada'; handleRegister('entrada'); }}
                    disabled={status === 'saving'}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {status === 'saving' ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                    {status === 'saving'
                      ? gpsAccuracy !== null
                        ? `GPS TRAVANDO... ±${gpsAccuracy}m`
                        : 'AGUARDANDO GPS...'
                      : 'Registrar Entrada'}
                  </button>
                ) : (
                  <button
                    onClick={() => { pendingRegisterType.current = 'saida'; handleRegister('saida'); }}
                    disabled={status === 'saving'}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {status === 'saving' ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                    {status === 'saving'
                      ? gpsAccuracy !== null
                        ? `GPS TRAVANDO... ±${gpsAccuracy}m`
                        : 'AGUARDANDO GPS...'
                      : 'Registrar Saída'}
                  </button>
                )}
                <button
                  disabled={status === 'saving'}
                  onClick={() => { 
                    setMatchedProvider(null); 
                    setStatus('scanning'); 
                    if (videoRef.current) videoRef.current.play(); 
                    startScanning(); 
                  }}
                  className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar — Escanear novamente
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 h-full flex flex-col">
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <ScanFace size={32} className="text-blue-400" />
                </div>
                <div>
                  <p className="font-black text-slate-700 uppercase text-sm mb-1">Aguardando Rosto</p>
                  <p className="text-slate-400 text-xs">Posicione o rosto em frente à câmera.</p>
                </div>
                {providerDescriptors.length > 0 && (
                  <div className="bg-slate-50 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">
                    {providerDescriptors.length} rosto{providerDescriptors.length !== 1 ? 's' : ''} cadastrado{providerDescriptors.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* History Panel Desktop */}
              <div className="border-t border-slate-100 pt-6 mt-2 hidden lg:block">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                  <Clock size={12} /> Check-ins Recentes Hoje
                </h3>
                <div className="space-y-3">
                  {historyToday.length > 0 ? historyToday.map(record => {
                    const prov = providers.find(p => p.id === record.providerId);
                    return (
                      <div key={record.id} className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${record.exitTime ? 'bg-slate-200 border-slate-300' : 'bg-emerald-100 border-emerald-200'}`}>
                            {record.exitTime ? <Clock size={12} className="text-slate-500"/> : <CheckCircle2 size={12} className="text-emerald-600"/>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-slate-800 uppercase truncate">{prov?.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                              <span className="flex items-center gap-1"><LogIn size={10} className="text-emerald-500"/> {record.entryTime}</span>
                              {record.exitTime && (
                                <>
                                  <span className="text-slate-300">|</span>
                                  <span className="flex items-center gap-1"><LogOut size={10} className="text-red-500"/> {record.exitTime}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-center text-xs font-bold text-slate-400 py-4">Nenhum registro hoje.</p>
                  )}
                </div>
              </div>

              {/* History Panel Mobile Button */}
              <div className="border-t border-slate-100 pt-6 mt-2 lg:hidden">
                <button 
                  onClick={() => setShowMobileHistory(true)}
                  className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 border border-slate-200 transition-all"
                >
                  <Clock size={16} /> Ver Check-ins Recentes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile History Modal */}
      {showMobileHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center lg:hidden">
          <div className="bg-white w-full h-[95vh] rounded-t-3xl flex flex-col border border-white/20 animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl shrink-0">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                <Clock size={16} className="text-blue-500" /> Check-ins Hoje
              </h3>
              <button onClick={() => setShowMobileHistory(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full hover:bg-slate-200 transition-all shadow-sm">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3 flex-1 pb-10">
              {historyToday.length > 0 ? historyToday.map(record => {
                const prov = providers.find(p => p.id === record.providerId);
                return (
                  <div key={record.id} className="flex flex-col gap-1 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${record.exitTime ? 'bg-slate-200 border-slate-300' : 'bg-emerald-100 border-emerald-200'}`}>
                        {record.exitTime ? <Clock size={16} className="text-slate-500"/> : <CheckCircle2 size={16} className="text-emerald-600"/>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-800 uppercase truncate">{prov?.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono font-bold">
                          <span className="flex items-center gap-1"><LogIn size={12} className="text-emerald-500"/> {record.entryTime}</span>
                          {record.exitTime && (
                            <>
                              <span className="text-slate-300">|</span>
                              <span className="flex items-center gap-1"><LogOut size={12} className="text-red-500"/> {record.exitTime}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-12">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum registro hoje.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceCheckIn;
