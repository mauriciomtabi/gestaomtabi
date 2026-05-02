
import React, { useState, useRef, useEffect, SyntheticEvent } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { extractAttendanceFromFile } from '../services/geminiService';
import { Upload, Loader2, Check, X, FileText, AlertCircle, Save, AlertTriangle, Image as ImageIcon, Sparkles, Cpu, Calculator } from 'lucide-react';
import { AttendanceRecord } from '../types';
import { calculateDuration, formatMinutesToHHMM } from '../utils/timeUtils';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configuração do worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
  providerId: string;
  providerName: string;
  existingRecords?: string[];
  onExtracted: (records: AttendanceRecord[]) => void;
  onCancel: () => void;
}

const processingMessages = [
  "Iniciando análise inteligente...",
  "Calibrando reconhecimento de caracteres...",
  "Identificando caligrafia manuscrita...",
  "Extraindo datas e horários...",
  "Calculando durações automaticamente...",
  "Validando integridade do documento...",
  "Finalizando processamento..."
];

const AttendanceSheetOCR: React.FC<Props> = ({ providerId, providerName, existingRecords = [], onExtracted, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; type: string } | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<AttendanceRecord>[]>([]);
  const [extractedName, setExtractedName] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [msgIndex, setMsgIndex] = useState(0);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Efeito para alternar mensagens de processamento
  useEffect(() => {
    let interval: number;
    if (loading) {
      interval = window.setInterval(() => {
        setMsgIndex((prev) => (prev + 1) % processingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const optimizeImage = (base64Str: string, maxWidth = 1600, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const convertPdfToImage = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setConverting(true);
    setFileMeta({ name: file.name, type: 'image/jpeg' });
    try {
      let base64 = '';
      if (file.type === 'application/pdf') {
        base64 = await convertPdfToImage(file);
      } else {
        const rawBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        base64 = await optimizeImage(rawBase64);
      }
      setPreview(base64);
      // Reseta o crop state sempre que uma nova imagem é carregada
      setCrop(undefined);
      setCompletedCrop(null);
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      alert('Não foi possível processar este arquivo.');
    } finally {
      setConverting(false);
    }
  };

  const getCroppedImageBase64 = async (): Promise<string | null> => {
    if (!completedCrop || !imgRef.current || completedCrop.width === 0 || completedCrop.height === 0) {
      return preview;
    }

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return preview;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleProcess = async () => {
    if (!preview || !fileMeta) return;
    setLoading(true);
    setMsgIndex(0);
    try {
      const finalImageBase64 = await getCroppedImageBase64() || preview;
      const base64 = finalImageBase64.split(',')[1];
      const result = await extractAttendanceFromFile(base64, 'image/jpeg');
      const records = result.records.map((r: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        providerId,
        date: r.date,
        entryTime: r.entryTime,
        exitTime: r.exitTime,
        durationMinutes: calculateDuration(r.entryTime, r.exitTime),
        attachmentData: preview,
        attachmentType: 'image/jpeg'
      }));
      setExtractedName(result.extractedProviderName);
      setExtractedData(records);
      setStep('review');
    } catch (error: any) {
      console.error('Erro na API do Gemini:', error);
      const errorMsg = error.message || 'Verifique a conexão ou a chave da API, e tente uma foto mais nítida.';
      alert(`Erro na leitura inteligente: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = (index: number, field: string, value: string) => {
    const updated = [...extractedData];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'entryTime' || field === 'exitTime') {
      const entry = field === 'entryTime' ? value : updated[index].entryTime!;
      const exit = field === 'exitTime' ? value : updated[index].exitTime!;
      updated[index].durationMinutes = calculateDuration(entry, exit);
    }
    setExtractedData(updated);
  };

  const removeRecord = (index: number) => {
    setExtractedData(extractedData.filter((_, i) => i !== index));
  };

  const isNameMismatched = extractedName && 
    !providerName.toLowerCase().split(' ').some(part => extractedName.toLowerCase().includes(part));

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[150] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .scan-line {
          position: absolute;
          width: 100%;
          height: 4px;
          background: linear-gradient(to bottom, transparent, #3b82f6, transparent);
          box-shadow: 0 0 15px 2px rgba(59, 130, 246, 0.7);
          z-index: 20;
          animation: scan 3s linear infinite;
        }
        .grid-overlay {
          background-size: 30px 30px;
          background-image: linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
        }
      `}</style>

      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto border border-white/20">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <FileText size={20} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800">
              {step === 'upload' ? 'Digitalizar Folha' : 'Conferência de Dados'}
            </h3>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 'upload' ? (
            <div className="space-y-6">
              {!preview && !converting ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <button 
                      onClick={() => {
                        const input = document.getElementById('camera-input');
                        if (input) input.click();
                      }} 
                      className="flex-1 flex flex-col items-center justify-center gap-4 py-8 border-4 border-dashed border-slate-100 bg-slate-50 text-slate-500 rounded-[2rem] hover:bg-blue-50 hover:border-blue-100 transition-all group"
                    >
                      <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                        <Camera size={32} className="text-blue-600" />
                      </div>
                      <div className="text-center">
                        <p className="font-black text-slate-800 uppercase tracking-tight text-sm">Tirar Foto</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Câmera Traseira</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => {
                        const input = document.getElementById('file-input');
                        if (input) input.click();
                      }} 
                      className="flex-1 flex flex-col items-center justify-center gap-4 py-8 border-4 border-dashed border-slate-100 bg-slate-50 text-slate-500 rounded-[2rem] hover:bg-blue-50 hover:border-blue-100 transition-all group"
                    >
                      <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                        <Upload size={32} className="text-blue-600" />
                      </div>
                      <div className="text-center">
                        <p className="font-black text-slate-800 uppercase tracking-tight text-sm">Fazer Upload</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Galeria ou PDF</p>
                      </div>
                    </button>

                    <input id="camera-input" type="file" onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                    <input id="file-input" type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border bg-slate-50 flex items-center justify-center min-h-[350px]">
                    {converting ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                        <p className="font-bold text-slate-500">Otimizando imagem...</p>
                      </div>
                    ) : (
                      <>
                        <div className="absolute top-4 left-0 w-full text-center z-10 pointer-events-none">
                          <p className="inline-block bg-blue-900/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-pulse">
                            Ajuste as bordas da folha
                          </p>
                        </div>
                        <ReactCrop 
                          crop={crop} 
                          onChange={(c) => setCrop(c)} 
                          onComplete={(c) => setCompletedCrop(c)}
                          className="flex items-center justify-center bg-slate-100"
                        >
                          <img 
                            ref={imgRef}
                            src={preview!} 
                            alt="Preview" 
                            className={`max-h-[50vh] object-contain w-full transition-all duration-700 ${loading ? 'scale-[1.02] blur-[1px]' : ''}`} 
                            onLoad={(e: SyntheticEvent<HTMLImageElement>) => {
                              const { width, height } = e.currentTarget;
                              // Define um crop inicial deixando uma pequena margem
                              setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
                            }}
                          />
                        </ReactCrop>
                        {loading && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/40 grid-overlay">
                            <div className="scan-line"></div>
                            
                            <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/20 flex flex-col items-center max-w-[80%] text-center animate-in zoom-in-95 duration-300">
                              <div className="relative mb-6">
                                <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping"></div>
                                <div className="bg-blue-600 p-4 rounded-full text-white relative">
                                  <Sparkles size={32} className="animate-pulse" />
                                </div>
                              </div>
                              
                              <h4 className="text-blue-900 font-black uppercase tracking-widest text-sm mb-2">Processamento Inteligente</h4>
                              <div className="h-6 flex items-center justify-center">
                                <p className="text-slate-600 font-bold text-xs animate-in slide-in-from-bottom-2 fade-in">
                                  {processingMessages[msgIndex]}
                                </p>
                              </div>
                              
                              <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-6 overflow-hidden">
                                <div 
                                  className="h-full bg-blue-600 transition-all duration-1000 ease-out" 
                                  style={{ width: `${((msgIndex + 1) / processingMessages.length) * 100}%` }}
                                ></div>
                              </div>
                              <p className="text-[10px] text-slate-400 font-black uppercase mt-4 flex items-center gap-1">
                                <Cpu size={10} /> Motor de Leitura Inteligente
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {!loading && !converting && (
                    <div className="flex gap-3">
                      <button onClick={() => setPreview(null)} className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-100 rounded-2xl">Trocar</button>
                      <button onClick={handleProcess} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2">
                        <Sparkles size={20} />
                        Ler e Analisar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                {isNameMismatched ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 items-start">
                    <AlertTriangle className="text-red-600 shrink-0" size={24} />
                    <div>
                      <h4 className="font-black text-red-700 text-sm uppercase">Divergência de Identidade</h4>
                      <p className="text-xs text-red-600 leading-relaxed">
                        O nome detectado (<strong className="underline">{extractedName}</strong>) não parece ser o mesmo deste cadastro.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl text-xs font-medium border border-amber-100">
                    <AlertCircle size={16} />
                    <span>Verifique os dados extraídos e corrija se necessário.</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-200">
                      <Calculator size={20} />
                    </div>
                    <span className="font-black text-blue-900 uppercase text-[10px] md:text-xs tracking-widest">Somatório da Folha:</span>
                  </div>
                  <span className="text-xl md:text-2xl font-black text-blue-700">
                    {formatMinutesToHHMM(extractedData.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0))}
                  </span>
                </div>
              </div>

              <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-2">
                {extractedData.map((record, idx) => {
                  const isDuplicate = existingRecords.some(key => {
                    const [d, ent, ext, t] = key.split('|');
                    if (d !== record.date) return false;
                    if (t === 'justification') return true;
                    return ent === record.entryTime && ext === record.exitTime;
                  });
                  
                  return (
                    <div key={idx} className={`p-4 rounded-2xl border flex flex-wrap gap-3 items-end relative group transition-all ${isDuplicate ? 'bg-amber-50/50 border-amber-200 opacity-80' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex-1 min-w-[120px]">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Data</label>
                          {isDuplicate && (
                            <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">Já Registrado</span>
                          )}
                        </div>
                        <input type="date" value={record.date} onChange={(e) => handleUpdateField(idx, 'date', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm" />
                      </div>
                      <div className="flex-1 min-w-[80px]">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Entrada</label>
                        <input type="time" value={record.entryTime} onChange={(e) => handleUpdateField(idx, 'entryTime', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm" />
                      </div>
                      <div className="flex-1 min-w-[80px]">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Saída</label>
                        <input type="time" value={record.exitTime} onChange={(e) => handleUpdateField(idx, 'exitTime', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm" />
                      </div>
                      <button onClick={() => removeRecord(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><X size={18} /></button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button onClick={() => setStep('upload')} className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl">Voltar</button>
                <button 
                  onClick={() => onExtracted(extractedData as AttendanceRecord[])} 
                  className={`flex-1 py-4 px-2 text-[11px] sm:text-base text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-1 sm:gap-2 transition-all ${isNameMismatched ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  <Save size={18} className="shrink-0" />
                  Confirmar Registros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceSheetOCR;
