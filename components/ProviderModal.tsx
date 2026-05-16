
import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Save, UserPlus, Upload, Loader2, Edit3, FileText, CheckCircle2, Calculator, Sparkles, Cpu, AlertCircle, Camera } from 'lucide-react';
import { Provider } from '../types';
import { extractReferralData, detectFaceInDocument } from '../services/geminiService';
import { sanitizeObservations } from '../utils/timeUtils';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
  provider?: Provider;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void> | void;
}

const processingMessages = [
  "Lendo folha de encaminhamento...",
  "Identificando dados do Poder Judiciário...",
  "Extraindo número do processo...",
  "Cruzando dados de contato...",
  "Analisando período de cumprimento...",
  "Calculando total de horas...",
  "Processando observações..."
];

const identityProcessingMessages = [
  "Lendo documento de identidade...",
  "Identificando biometria facial...",
  "Detectando contornos do rosto...",
  "Extraindo foto de perfil...",
  "Validando qualidade da imagem...",
  "Finalizando recorte inteligente..."
];

const cropImage = (base64: string, box: number[]): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);

      const [ymin, xmin, ymax, xmax] = box;
      const margin = 0.1;
      const h_total = ymax - ymin;
      const w_total = xmax - xmin;
      
      const y1 = Math.max(0, ymin - h_total * margin);
      const x1 = Math.max(0, xmin - w_total * margin);
      const y2 = Math.min(1000, ymax + h_total * margin);
      const x2 = Math.min(1000, xmax + w_total * margin);

      const realX = (x1 / 1000) * img.width;
      const realY = (y1 / 1000) * img.height;
      const realW = ((x2 - x1) / 1000) * img.width;
      const realH = ((y2 - y1) / 1000) * img.height;

      const size = Math.max(realW, realH);
      canvas.width = size;
      canvas.height = size;
      
      const offsetX = (size - realW) / 2;
      const offsetY = (size - realH) / 2;
      
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, realX, realY, realW, realH, offsetX, offsetY, realW, realH);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
  });
};

const ProviderModal: React.FC<Props> = ({ provider, onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [currentMessages, setCurrentMessages] = useState(processingMessages);
  const [formData, setFormData] = useState({
    name: '',
    processNumber: '',
    phone: '',
    address: '',
    assignedEntity: 'Corpo de Bombeiros Militar',
    totalHoursToFulfill: 40,
    identityDoc: '',
    referralDoc: '',
    profilePhoto: '',
    observations: '',
    referralDate: '',
    receiptDate: ''
  });

  useEffect(() => {
    let interval: number;
    if (loading) {
      interval = window.setInterval(() => {
        setMsgIndex((prev) => (prev + 1) % currentMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading, currentMessages]);

  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name || '',
        processNumber: provider.processNumber || '',
        phone: provider.phone || '',
        address: provider.address || '',
        assignedEntity: provider.assignedEntity || 'Corpo de Bombeiros Militar',
        totalHoursToFulfill: provider.totalHoursToFulfill || 40,
        identityDoc: provider.identityDoc || '',
        referralDoc: provider.referralDoc || '',
        profilePhoto: provider.profilePhoto || '',
        observations: provider.observations || '',
        referralDate: provider.referralDate || '',
        receiptDate: provider.receiptDate || ''
      });
    } else {
      setFormData({
        name: '',
        processNumber: '',
        phone: '',
        address: '',
        assignedEntity: 'Corpo de Bombeiros Militar',
        totalHoursToFulfill: 40,
        identityDoc: '',
        referralDoc: '',
        profilePhoto: '',
        observations: '',
        referralDate: '',
        receiptDate: ''
      });
      setIsCalculated(false);
    }
  }, [provider]);

  const referralInputRef = useRef<HTMLInputElement>(null);
  const referralCameraInputRef = useRef<HTMLInputElement>(null);
  const identityInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [referralPreview, setReferralPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  const convertPdfToImage = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/png');
  };

  const processFile = async (file: File, isIdentity: boolean) => {
    setLoading(true);
    setMsgIndex(0);
    setCurrentMessages(isIdentity ? identityProcessingMessages : processingMessages);
    try {
      let base64 = '';
      if (file.type === 'application/pdf') {
        base64 = await convertPdfToImage(file);
      } else {
        base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      if (isIdentity) {
        try {
          const detection = await detectFaceInDocument(base64.split(',')[1], file.type);
          if (detection.box_2d) {
            const cropped = await cropImage(base64, detection.box_2d);
            setFormData(prev => ({ ...prev, identityDoc: base64, profilePhoto: cropped }));
          } else {
            setFormData(prev => ({ ...prev, identityDoc: base64 }));
          }
        } catch (e) {
          console.error("Erro na detecção de rosto:", e);
          setFormData(prev => ({ ...prev, identityDoc: base64 }));
        }
      } else {
        const data = await extractReferralData(base64.split(',')[1], 'image/png');
        if (data.totalHours) setIsCalculated(true);
        
        setFormData(prev => ({
          ...prev,
          referralDoc: base64,
          name: data.name || prev.name,
          processNumber: data.processNumber || prev.processNumber,
          phone: data.phone || prev.phone,
          address: data.address || prev.address,
          assignedEntity: data.assignedEntity || prev.assignedEntity,
          totalHoursToFulfill: data.totalHours || prev.totalHoursToFulfill,
          referralDate: data.referralDate || prev.referralDate,
          receiptDate: data.receiptDate || prev.receiptDate,
          observations: sanitizeObservations(data.observations || prev.observations)
        }));
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar o documento digitalizado.");
    } finally {
      setLoading(false);
    }
  };

  const getCroppedImageBase64 = async (): Promise<string | null> => {
    if (!completedCrop || !imgRef.current || completedCrop.width === 0 || completedCrop.height === 0) {
      return referralPreview;
    }

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return referralPreview;

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

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleConfirmCrop = async () => {
    const croppedBase64 = await getCroppedImageBase64();
    if (!croppedBase64) return;
    setReferralPreview(null);
    setCrop(undefined);
    setCompletedCrop(null);
    processReferralBase64(croppedBase64);
  };

  const processReferralBase64 = async (base64: string) => {
    setLoading(true);
    setMsgIndex(0);
    setCurrentMessages(processingMessages);
    try {
      const data = await extractReferralData(base64.split(',')[1], 'image/png');
      if (data.totalHours) setIsCalculated(true);
      
      setFormData(prev => ({
        ...prev,
        referralDoc: base64,
        name: data.name || prev.name,
        processNumber: data.processNumber || prev.processNumber,
        phone: data.phone || prev.phone,
        address: data.address || prev.address,
        assignedEntity: data.assignedEntity || prev.assignedEntity,
        totalHoursToFulfill: data.totalHours || prev.totalHoursToFulfill,
        referralDate: data.referralDate || prev.referralDate,
        receiptDate: data.receiptDate || prev.receiptDate,
        observations: sanitizeObservations(data.observations || prev.observations)
      }));
    } catch (err) {
      console.error(err);
      alert("Erro ao processar o documento digitalizado.");
    } finally {
      setLoading(false);
    }
  };

  const handleIdentityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, true);
  };

  const handleReferralChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      let base64 = '';
      if (file.type === 'application/pdf') {
        base64 = await convertPdfToImage(file);
      } else {
        base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      setReferralPreview(base64);
      setCrop(undefined);
      setCompletedCrop(null);
    } catch (err) {
      console.error("Erro ao preparar imagem:", err);
      alert("Erro ao ler o documento.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações manuais para prevenir erros no banco
    if (!formData.name.trim()) {
      alert("Por favor, preencha o Nome Completo.");
      return;
    }
    if (!formData.processNumber.trim()) {
      alert("Por favor, preencha o Número do Processo.");
      return;
    }
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setIsSubmitting(false);
    } catch (error: any) {
      console.error("Erro na submissão:", error);
      alert(`Erro ao salvar cadastro: ${error.message || 'Verifique sua conexão e tente novamente.'}`);
      setIsSubmitting(false); // Reset necessário para permitir nova tentativa
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'totalHoursToFulfill') setIsCalculated(false);
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalHoursToFulfill' ? (Number(value) || 0) : value
    }));
  };

  const inputClasses = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-200";
  const labelClasses = "text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block ml-1";

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <style>{`
        @keyframes scan-laser {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .laser-line {
          position: absolute;
          width: 100%;
          height: 3px;
          background: #3b82f6;
          box-shadow: 0 0 12px 2px rgba(59, 130, 246, 0.8);
          z-index: 50;
          animation: scan-laser 2.5s linear infinite;
        }
      `}</style>

      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] border border-white/20 relative">
        {(loading || isSubmitting) && (
          <div className="absolute inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
            {loading && <div className="laser-line"></div>}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-xs border border-blue-100">
              <div className="bg-blue-600 p-4 rounded-2xl text-white mb-6 animate-bounce">
                {isSubmitting ? <Save size={32} /> : <Sparkles size={32} />}
              </div>
              <h4 className="text-slate-800 font-black uppercase tracking-tight text-lg mb-2">
                {isSubmitting ? 'Salvando...' : 'Leitura Inteligente'}
              </h4>
              <p className="text-slate-500 font-bold text-xs h-10 flex items-center justify-center leading-relaxed">
                {isSubmitting ? 'Persistindo dados no banco de dados...' : currentMessages[msgIndex]}
              </p>
              {!isSubmitting && (
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-6 overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-1000 ease-out" 
                    style={{ width: `${((msgIndex + 1) / currentMessages.length) * 100}%` }}
                  ></div>
                </div>
              )}
              {isSubmitting && (
                <div className="mt-6">
                  <Loader2 className="animate-spin text-blue-600" size={24} />
                </div>
              )}
              <p className="text-[10px] text-slate-400 font-black uppercase mt-4 flex items-center gap-1">
                <Cpu size={12} className="text-blue-500" /> Processamento Criptografado
              </p>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
              {provider ? <Edit3 size={22} /> : <UserPlus size={22} />}
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-800">{provider ? 'Editar Cadastro' : 'Novo Prestador'}</h3>
              <p className="text-xs text-slate-500 font-medium">{provider ? 'Atualize os dados do perfil' : 'Cadastre um novo perfil no sistema'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-5 overflow-y-auto">
          {referralPreview ? (
            <div className="flex flex-col space-y-4">
              <div className="bg-slate-100 rounded-2xl p-2 flex justify-center border border-slate-200">
                <ReactCrop 
                  crop={crop} 
                  onChange={(c) => setCrop(c)} 
                  onComplete={(c) => setCompletedCrop(c)}
                  className="max-h-[60vh]"
                >
                  <img 
                    ref={imgRef}
                    src={referralPreview} 
                    alt="Preview" 
                    className="max-h-[60vh] object-contain w-full"
                    onLoad={() => setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 })}
                  />
                </ReactCrop>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setReferralPreview(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 rounded-2xl transition-all">Cancelar</button>
                <button type="button" onClick={handleConfirmCrop} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl hover:bg-blue-700 flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} /> Confirmar e Analisar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-50">
            <div className="relative">
              <label className={labelClasses}>Documento de Identidade</label>
              <button 
                type="button" 
                onClick={() => identityInputRef.current?.click()}
                disabled={loading || isSubmitting}
                className={`w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed transition-all ${formData.identityDoc ? 'border-green-200 bg-green-50 text-green-600' : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'} disabled:opacity-50 font-black text-[10px] uppercase`}
              >
                {formData.identityDoc ? <CheckCircle2 size={18} /> : <Upload size={18} />}
                {formData.identityDoc ? 'Anexada' : 'Anexar'}
              </button>
              <input type="file" ref={identityInputRef} onChange={handleIdentityChange} accept="image/*,application/pdf" className="hidden" />
              
              {formData.profilePhoto && (
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full border-2 border-white shadow-md overflow-hidden bg-white z-10 animate-in zoom-in">
                  <img src={formData.profilePhoto} alt="Rosto" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className={labelClasses}>Encaminhamento</label>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => referralCameraInputRef.current?.click()}
                  disabled={loading || isSubmitting}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border-2 transition-all ${formData.referralDoc ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'} disabled:opacity-50 font-black text-[9px] uppercase`}
                >
                  <Camera size={18} />
                  Câmera
                </button>
                <button 
                  type="button" 
                  onClick={() => referralInputRef.current?.click()}
                  disabled={loading || isSubmitting}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border-2 border-dashed transition-all ${formData.referralDoc ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'} disabled:opacity-50 font-black text-[9px] uppercase`}
                >
                  <Upload size={18} />
                  Upload
                </button>
              </div>
              <input type="file" ref={referralInputRef} onChange={handleReferralChange} accept="image/*,application/pdf" className="hidden" />
              <input type="file" ref={referralCameraInputRef} onChange={handleReferralChange} accept="image/*" capture="environment" className="hidden" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="group">
              <label className={labelClasses}>Nome Completo</label>
              <input 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="Nome completo do prestador" 
                className={inputClasses} 
                disabled={isSubmitting} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="group">
                <label className={labelClasses}>Nº do Processo</label>
                <input name="processNumber" value={formData.processNumber} onChange={handleChange} placeholder="0000000-00.202X.8.21.0035" className={inputClasses} disabled={isSubmitting} />
              </div>
              <div className="group">
                <label className={labelClasses}>Telefone</label>
                <input name="phone" value={formData.phone} onChange={handleChange} placeholder="(51) 99999-9999" className={inputClasses} disabled={isSubmitting} />
              </div>
            </div>

            <div className="group">
              <label className={labelClasses}>Endereço</label>
              <input name="address" value={formData.address} onChange={handleChange} placeholder="Rua, Número, Bairro, Cidade" className={inputClasses} disabled={isSubmitting} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="group">
                <label className={labelClasses}>Data Encaminhamento</label>
                <input type="date" name="referralDate" value={formData.referralDate} onChange={handleChange} className={inputClasses} disabled={isSubmitting} />
              </div>
              <div className="group">
                <label className={labelClasses}>Data Recebimento</label>
                <input type="date" name="receiptDate" value={formData.receiptDate} onChange={handleChange} className={inputClasses} disabled={isSubmitting} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="group">
                <label className={labelClasses}>Entidade Designada</label>
                <select name="assignedEntity" value={formData.assignedEntity} onChange={handleChange} className={`${inputClasses} appearance-none bg-no-repeat bg-[right_1rem_center]`} disabled={isSubmitting}>
                  <option value="Corpo de Bombeiros Militar">Corpo de Bombeiros Militar</option>
                  <option value="Prefeitura Municipal">Prefeitura Municipal</option>
                  <option value="ONG Parceira">ONG Parceira</option>
                </select>
              </div>
              <div className="group relative">
                <label className={labelClasses}>Horas Totais</label>
                <div className="relative">
                  <input 
                    type="number" 
                    name="totalHoursToFulfill" 
                    value={formData.totalHoursToFulfill} 
                    onChange={handleChange} 
                    className={`${inputClasses} ${isCalculated ? 'border-blue-400 bg-blue-50/30 pr-10' : ''}`} 
                    disabled={isSubmitting}
                  />
                  {isCalculated && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500">
                      <Calculator size={18} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="group">
              <label className={labelClasses}>Observações</label>
              <textarea name="observations" value={formData.observations} onChange={handleChange} rows={3} placeholder="Notas adicionais..." className={`${inputClasses} resize-none`} disabled={isSubmitting} />
            </div>

            <div className="pt-6 flex gap-4 sticky bottom-0 bg-white">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3.5 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={loading || isSubmitting} className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50">
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (!provider && <Save size={20} />)}
                {isSubmitting ? 'Salvando...' : provider ? 'Salvar Alterações' : 'Salvar Cadastro'}
              </button>
            </div>
          </form>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderModal;
