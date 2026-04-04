import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, CheckCircle2, AlertCircle, Loader2, Scan, UserCheck, Trash2, SwitchCamera } from 'lucide-react';
import { loadFaceModels, detectFaceDescriptor, descriptorToArray } from '../services/faceService';
import { saveFaceDescriptor, deleteFaceDescriptor, updateProvider } from '../services/supabaseService';
import { Provider } from '../types';

interface Props {
  provider: Provider;
  onClose: () => void;
  onSuccess: (hasFace: boolean, photoBase64?: string) => void;
  hasExistingFace: boolean;
}

type Status = 'idle' | 'loading-models' | 'ready' | 'confirming' | 'detecting' | 'success' | 'error' | 'saving';

const FaceEnrollment: React.FC<Props> = ({ provider, onClose, onSuccess, hasExistingFace }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>('loading-models');
  const [message, setMessage] = useState('Preparando processamento...');
  const [faceDetected, setFaceDetected] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('ready');
      setMessage('Posicione seu rosto no centro. Clique em "Capturar Rosto" quando estiver pronto.');

      // Continuous detection preview
      detectionIntervalRef.current = setInterval(async () => {
        if (videoRef.current && status !== 'detecting' && status !== 'saving' && status !== 'success') {
          try {
            const descriptor = await detectFaceDescriptor(videoRef.current);
            setFaceDetected(!!descriptor);
          } catch { /* silently ignore */ }
        }
      }, 300);
    } catch {
      setStatus('error');
      setMessage('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  }, [status]);

  useEffect(() => {
    loadFaceModels()
      .then(() => { startCamera('environment'); })
      .catch((err: Error) => {
        setStatus('error');
        setMessage(err.message);
      });

    return () => { stopCamera(); };
  }, []);

  // Called when user clicks the Capture button — shows confirmation first
  const handleRequestCapture = () => {
    if (!faceDetected) {
      setMessage('Nenhum rosto detectado. Certifique-se de que o rosto está bem iluminado e centralizado.');
      return;
    }
    setStatus('confirming');
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setStatus('detecting');
    setMessage('Analisando rosto...');

    try {
      const descriptor = await detectFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setStatus('ready');
        setMessage('Nenhum rosto detectado. Certifique-se de que o rosto está bem iluminado e centralizado.');
        return;
      }

      setStatus('saving');
      setMessage('Salvando dados biométricos e foto de perfil...');
      
      // Capture frame from video to use as profile photo
      let photoBase64 = provider.profilePhoto;
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        // Make canvas square roughly matching the face area
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw center crop
          const offsetX = (video.videoWidth - size) / 2;
          const offsetY = (video.videoHeight - size) / 2;
          ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);
          photoBase64 = canvas.toDataURL('image/jpeg', 0.8);
        }
      }

      await Promise.all([
        saveFaceDescriptor(provider.id, descriptorToArray(descriptor)),
        photoBase64 !== provider.profilePhoto ? updateProvider(provider.id, { profilePhoto: photoBase64 }) : Promise.resolve()
      ]);
      
      stopCamera();
      setStatus('success');
      setMessage('Rosto cadastrado com sucesso!');
      setTimeout(() => onSuccess(true, photoBase64), 1500);
    } catch (err: any) {
      setStatus('error');
      setMessage(`Erro: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    try {
      setStatus('saving');
      setMessage('Removendo credenciais e foto de perfil...');
      await Promise.all([
        deleteFaceDescriptor(provider.id),
        updateProvider(provider.id, { profilePhoto: '' })
      ]);
      onSuccess(false, '');
    } catch (err: any) {
      setStatus('error');
      setMessage(`Erro ao remover: ${err.message}`);
    }
  };

  const isLoading = ['loading-models', 'detecting', 'saving'].includes(status);
  const isConfirming = status === 'confirming';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-xl">
              <Camera size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-black text-sm uppercase tracking-tight">Cadastrar Rosto</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase">{provider.name}</p>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative bg-black aspect-[4/3] mx-4 mt-4 rounded-2xl overflow-hidden">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover transition-opacity duration-500 ${status === 'loading-models' ? 'opacity-0' : 'opacity-100'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            muted
            playsInline
            autoPlay
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Camera Controls */}
          {status === 'ready' && (
            <button
              onClick={async () => {
                const newMode = facingMode === 'user' ? 'environment' : 'user';
                setFacingMode(newMode);
                stopCamera();
                setStatus('detecting');
                setMessage('Trocando câmera...');
                await startCamera(newMode);
              }}
              className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-full text-white hover:bg-black/70 transition-all border border-white/20 active:scale-95 z-20"
              title="Trocar Câmera"
            >
              <SwitchCamera size={20} />
            </button>
          )}
          {/* Face detection overlay */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
            <div className={`w-48 h-48 md:w-56 md:h-56 rounded-full border-4 transition-all duration-500 ${
              faceDetected ? 'border-emerald-400 shadow-lg shadow-emerald-400/30' : 'border-white/30'
            }`} />
          </div>
          {/* Status overlay */}
          {status === 'loading-models' && (
            <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-20">
              <Loader2 size={32} className="text-white animate-spin mb-2" />
              <p className="text-white text-xs font-bold">Preparando modelos...</p>
            </div>
          )}
          {status === 'success' && (
            <div className="absolute inset-0 bg-emerald-900/80 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-white text-sm font-black uppercase">Cadastrado!</p>
              </div>
            </div>
          )}
          {/* Confirmation overlay */}
          {isConfirming && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-30 p-6">
              <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full text-center">
                <Camera size={32} className="text-blue-400 mx-auto mb-3" />
                <p className="text-white font-black uppercase text-sm mb-1">Confirmar Captura</p>
                <p className="text-slate-400 text-xs mb-5">O rosto atual na câmera será registrado como a biometria de <strong className="text-white">{provider.name}</strong>. Confirma?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStatus('ready')}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-xs font-black uppercase hover:bg-white/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCapture}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Face detected indicator */}
          {status === 'ready' && (
            <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${
              faceDetected ? 'bg-emerald-500/90 text-white' : 'bg-black/50 text-slate-400'
            }`}>
              <Scan size={12} />
              {faceDetected ? 'Rosto Detectado' : 'Procurando Rosto'}
            </div>
          )}
        </div>

        {/* Message */}
        <div className="px-4 py-3">
          <div className={`flex items-start gap-2 p-3 rounded-xl text-[11px] font-semibold ${
            status === 'error' ? 'bg-red-500/10 text-red-300' :
            status === 'success' ? 'bg-emerald-500/10 text-emerald-300' :
            'bg-white/5 text-slate-400'
          }`}>
            {status === 'error' ? <AlertCircle size={14} className="shrink-0 mt-0.5" /> :
             status === 'success' ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> :
             <UserCheck size={14} className="shrink-0 mt-0.5" />}
            {message}
          </div>
        </div>

        {/* Instructions Panel */}
        {status === 'ready' && (
          <div className="px-4 pb-4">
            <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-1.5">
                <AlertCircle size={12} /> Boas Práticas de Captura
              </p>
              <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Esteja em um local <strong>bem iluminado</strong></li>
                <li>O rosto deve estar <strong>sem máscaras</strong> ou óculos escuros</li>
                <li>Olhe <strong>diretamente</strong> para a câmera do aparelho</li>
                <li>Aguarde o indicador verde de "Rosto Detectado"</li>
              </ul>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-2">
          {hasExistingFace && status !== 'success' && (
            <button
              onClick={handleDelete}
              className="px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-[11px] font-black uppercase flex items-center gap-2"
            >
              <Trash2 size={14} />
              Remover
            </button>
          )}
          <button
            onClick={handleRequestCapture}
            disabled={isLoading || isConfirming || status !== 'ready'}
            className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              faceDetected && status === 'ready'
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                : 'bg-white/5 text-slate-500'
            } disabled:cursor-not-allowed`}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            {isLoading ? 'Processando...' : 'Capturar Rosto'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FaceEnrollment;
