import React, { useState, useRef, SyntheticEvent } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Camera, Upload, Loader2, CheckCircle2, AlertCircle, FileText, Cpu, Receipt, ArrowRight, SkipForward, Wrench, Fuel } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { FuelSupply } from '../types';

interface Props {
  onExtracted: (supply: FuelSupply) => void;
  onCancel: () => void;
}

type CaptureStep = 'select' | 'capture' | 'review' | 'processing' | 'next_prompt';
type DocType = 'nf' | 'ticket';

const FuelReceiptOCR: React.FC<Props> = ({ onExtracted, onCancel }) => {
  const [entryType, setEntryType] = useState<'abastecimento' | 'manutencao'>('abastecimento');
  const [step, setStep] = useState<CaptureStep>('select');
  const [currentDocType, setCurrentDocType] = useState<DocType | null>(null);
  const [captureMethod, setCaptureMethod] = useState<'camera' | 'upload' | null>(null);
  
  // Imagens capturadas (cropped base64)
  const [images, setImages] = useState<{ nf: string | null, ticket: string | null }>({ nf: null, ticket: null });
  
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setCrop(undefined);
      setCompletedCrop(null);
      setError(null);
      setStep('review');
    };
    reader.readAsDataURL(file);
  };

  const getCroppedImageBase64 = async (): Promise<string | null> => {
    if (!imgRef.current) return preview;

    const originalWidth = imgRef.current.naturalWidth;
    const originalHeight = imgRef.current.naturalHeight;
    
    let cropX = 0;
    let cropY = 0;
    let cropWidth = originalWidth;
    let cropHeight = originalHeight;

    // Se houve interação com o Crop e selecionou uma área
    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      const scaleX = originalWidth / imgRef.current.width;
      const scaleY = originalHeight / imgRef.current.height;
      cropX = completedCrop.x * scaleX;
      cropY = completedCrop.y * scaleY;
      cropWidth = completedCrop.width * scaleX;
      cropHeight = completedCrop.height * scaleY;
    }

    // Calcula um teto máximo para a imagem não estourar payload JSON (108MP Cameras)
    const MAX_DIMENSION = 2400;
    let scaleRatio = 1;
    if (Math.max(cropWidth, cropHeight) > MAX_DIMENSION) {
        scaleRatio = MAX_DIMENSION / Math.max(cropWidth, cropHeight);
    }

    const finalWidth = cropWidth * scaleRatio;
    const finalHeight = cropHeight * scaleRatio;

    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return preview;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      imgRef.current,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      finalWidth,
      finalHeight
    );

    // 0.95 preserva perfeitamente os pixels para o OCR sem explodir o peso base64
    return canvas.toDataURL('image/jpeg', 0.95); 
  };

  const handleSelectDoc = (type: DocType) => {
    setCurrentDocType(type);
    setStep('capture');
  };

  const handleConfirmPhoto = async () => {
    if (!preview || !currentDocType) return;
    setLoading(true);
    
    try {
      const finalImageBase64 = await getCroppedImageBase64() || preview;
      
      const newImages = { ...images, [currentDocType]: finalImageBase64 };
      setImages(newImages);
      
      // Verifica se falta algum documento para dar continuidade automatizada
      if (currentDocType === 'nf' && !newImages.ticket) {
        setCurrentDocType('ticket');
        setPreview(null);
        setStep('next_prompt');
        setLoading(false);
      } else if (currentDocType === 'ticket' && !newImages.nf) {
        setCurrentDocType('nf');
        setPreview(null);
        setStep('next_prompt');
        setLoading(false);
      } else {
        // Tem os dois, ou escolheu finalizar direto
        processFinal(newImages);
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao processar imagem. Tente novamente.");
      setLoading(false);
    }
  };

  const handleSkipSecond = async () => {
    if (!preview || !currentDocType) return;
    setLoading(true);
    
    try {
      const finalImageBase64 = await getCroppedImageBase64() || preview;
      const newImages = { ...images, [currentDocType]: finalImageBase64 };
      setImages(newImages);
      processFinal(newImages);
    } catch (err) {
      console.error(err);
      setError("Erro ao processar imagem. Tente novamente.");
      setLoading(false);
    }
  };

  const processFinal = async (finalImages: { nf: string | null, ticket: string | null }) => {
    setStep('processing');
    setLoading(true);
    setError(null);

    try {
      let result = {} as any;
      
      // Só executa a IA se tiver a Nota Fiscal capturada
      if (finalImages.nf) {
        const base64Data = finalImages.nf.split(',')[1];
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (globalThis as any).process?.env?.GEMINI_API_KEY;
        
        if (!apiKey) {
          throw new Error("API Key do Gemini não configurada.");
        }
        
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = entryType === 'manutencao'
          ? `Analise esta nota fiscal de manutenção/revisão/troca de óleo e extraia os seguintes dados em formato JSON.
          IMPORTANTE: Como se trata de uma manutenção/revisão, extraia a lista completa de peças, lubrificantes, filtros e serviços adquiridos.
          Extraia a data e hora EXATAMENTE como constam na nota.
          
          - data: Data e hora da manutenção (formato ISO local YYYY-MM-DDTHH:mm, ignore fuso horário)
          - local: Nome do estabelecimento/oficina/posto
          - cnpj: CNPJ do estabelecimento
          - driver: Nome do motorista (se disponível)
          - plate: Placa do veículo. REGRAS CRÍTICAS PARA PLACA:
            1. O formato brasileiro é 3 LETRAS seguidas de 4 NÚMEROS (ABC1234) ou o padrão Mercosul (ABC1D23).
            2. Os 3 PRIMEIROS caracteres são SEMPRE LETRAS. Nunca confunda '0' com 'O' ou '1' com 'I' nestas posições.
            3. No padrão Mercosul, o 5º caractere é SEMPRE uma LETRA.
            4. Verifique cuidadosamente se o que parece um '0' (zero) não é na verdade a letra 'O' nas posições de letras, e vice-versa.
          - km: Quilometragem do veículo (número, se disponível)
          - attendant: Nome do atendente/mecânico (se disponível)
          - protocol: Número do protocolo ou da nota fiscal (se disponível)
          - totalValue: Valor total pago de todas as peças/serviços somados (número)
          - items: Lista de peças, produtos ou serviços adquiridos. Cada item deve conter:
            * description: Descrição/nome do produto ou serviço (ex: Filtro Óleo, Óleo 5w30, Filtro Ar)
            * quantity: Quantidade adquirida (número, ex: 1, 11.5)
            * unitValue: Valor unitário (número)
            * totalValue: Valor total do item (número)
          
          Se algum dado não for encontrado, deixe como string vazia ou zero para números. A lista de items deve ser um array.`
          : `Analise esta nota fiscal de abastecimento e extraia os seguintes dados em formato JSON. 
          IMPORTANTE: Extraia a data e hora EXATAMENTE como constam na nota.
          
          - data: Data e hora do abastecimento (formato ISO local YYYY-MM-DDTHH:mm, ignore fuso horário)
          - local: Nome do posto ou estabelecimento
          - cnpj: CNPJ do estabelecimento
          - fuelType: Tipo de combustível (ex: Gasolina Comum, Diesel S10)
          - liters: Quantidade de litros (número)
          - pricePerLiter: Preço por litro (número)
          - totalValue: Valor total pago (número)
          - driver: Nome do motorista (se disponível)
          - plate: Placa do veículo. REGRAS CRÍTICAS PARA PLACA:
            1. O formato brasileiro é 3 LETRAS seguidas de 4 NÚMEROS (ABC1234) ou o padrão Mercosul (ABC1D23).
            2. Os 3 PRIMEIROS caracteres são SEMPRE LETRAS. Nunca confunda '0' com 'O' ou '1' com 'I' nestas posições.
            3. No padrão Mercosul, o 5º caractere é SEMPRE uma LETRA.
            4. Verifique cuidadosamente se o que parece um '0' (zero) não é na verdade a letra 'O' nas posições de letras, e vice-versa.
          - km: Quilometragem do veículo (número, se disponível)
          - attendant: Nome do atendente (se disponível)
          - protocol: Número do protocolo ou da nota fiscal (se disponível)
          
          Se algum dado não for encontrado, deixe como string vazia ou zero para números.`;

        const responseSchema = entryType === 'manutencao'
          ? {
              type: Type.OBJECT,
              properties: {
                data: { type: Type.STRING },
                local: { type: Type.STRING },
                cnpj: { type: Type.STRING },
                driver: { type: Type.STRING },
                plate: { type: Type.STRING },
                km: { type: Type.NUMBER },
                attendant: { type: Type.STRING },
                protocol: { type: Type.STRING },
                totalValue: { type: Type.NUMBER },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      description: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      unitValue: { type: Type.NUMBER },
                      totalValue: { type: Type.NUMBER }
                    },
                    required: ["description", "quantity", "unitValue", "totalValue"]
                  }
                }
              }
            }
          : {
              type: Type.OBJECT,
              properties: {
                data: { type: Type.STRING },
                local: { type: Type.STRING },
                cnpj: { type: Type.STRING },
                fuelType: { type: Type.STRING },
                liters: { type: Type.NUMBER },
                pricePerLiter: { type: Type.NUMBER },
                totalValue: { type: Type.NUMBER },
                driver: { type: Type.STRING },
                plate: { type: Type.STRING },
                km: { type: Type.NUMBER },
                attendant: { type: Type.STRING },
                protocol: { type: Type.STRING }
              }
            };

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                  }
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        });

        result = JSON.parse(response.text || '{}');
      }
      
      const getLocalISOString = (date: Date) => {
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
      };

      const supply: FuelSupply = {
        id: 'temp-' + Date.now(),
        date: result.data || getLocalISOString(new Date()),
        location: result.local || '',
        cnpj: result.cnpj || '',
        fuelType: entryType === 'manutencao' ? 'VÁRIOS ITENS' : (result.fuelType || ''),
        liters: entryType === 'manutencao' ? 0 : (result.liters || 0),
        pricePerLiter: entryType === 'manutencao' ? 0 : (result.pricePerLiter || 0),
        totalValue: result.totalValue || 0,
        driver: result.driver || '',
        plate: result.plate || '',
        km: result.km || 0,
        attendant: result.attendant || '',
        protocol: result.protocol || '',
        entryType: entryType,
        items: entryType === 'manutencao' ? (result.items || []) : [],
        attachmentData: finalImages.nf || '',
        attachmentType: finalImages.nf ? 'image/jpeg' : '',
        ticketLogData: finalImages.ticket || '',
        ticketLogType: finalImages.ticket ? 'image/jpeg' : '',
        createdAt: new Date().toISOString()
      };

      onExtracted(supply);
    } catch (err: any) {
      console.error("Erro no processamento Final:", err);
      setError("Não foi possível processar a nota. Tente tirar fotos mais nítidas ou preencher manualmente.");
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const getDocTitle = (type: DocType | null) => type === 'nf' ? 'Nota Fiscal' : 'Ticket Log';

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[3000] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col my-auto border border-white/10">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <FileText size={20} />
            </div>
            <h3 className="font-black text-blue-900 uppercase tracking-tight text-sm">Registro Documental</h3>
          </div>
          <button onClick={onCancel} className="p-2.5 hover:bg-blue-100 text-blue-400 transition-colors rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex flex-col items-center text-center space-y-6">
          
          {step === 'select' && (
            <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2 mx-auto">
                <Receipt size={40} />
              </div>
              
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 w-full max-w-sm mx-auto mb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEntryType('abastecimento')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    entryType === 'abastecimento'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Fuel size={12} />
                  Abastecimento
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('manutencao')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    entryType === 'manutencao'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Wrench size={12} />
                  Manutenção
                </button>
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Qual documento capturar?</h4>
                <p className="text-slate-500 text-sm mt-2 font-medium">Recomendamos enviar ambos (Nota Fiscal e Ticket Log) para registro completo.</p>
              </div>
              
              <div className="flex flex-col gap-3 mt-6">
                <button 
                  onClick={() => handleSelectDoc('nf')}
                  className={`py-4 rounded-2xl shadow-sm border transition-all active:scale-95 flex items-center justify-between px-6 ${images.nf ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                >
                  <div className="flex items-center gap-3 font-black uppercase text-xs tracking-widest">
                    <FileText size={20} />
                    Nota Fiscal {images.nf && '(Capturada)'}
                  </div>
                  {images.nf ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Camera size={20} className="text-slate-400" />}
                </button>
                
                <button 
                  onClick={() => handleSelectDoc('ticket')}
                  className={`py-4 rounded-2xl shadow-sm border transition-all active:scale-95 flex items-center justify-between px-6 ${images.ticket ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                >
                  <div className="flex items-center gap-3 font-black uppercase text-xs tracking-widest">
                    <Receipt size={20} />
                    Ticket Log {images.ticket && '(Capturado)'}
                  </div>
                  {images.ticket ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Camera size={20} className="text-slate-400" />}
                </button>
              </div>

              {(images.nf || images.ticket) && (
                <button 
                  onClick={() => processFinal(images)}
                  className="mt-4 w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest"
                >
                  Finalizar e Processar Dados
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          )}

          {step === 'capture' && (
            <div className="w-full flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-blue-100 text-blue-800 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl mb-6">
                Enviando {getDocTitle(currentDocType)}
              </div>
              
              <div className="flex flex-col sm:flex-row w-full gap-4">
                <button onClick={() => { setCaptureMethod('camera'); const input = document.getElementById('camera-input'); if (input) input.click(); }} className="flex-1 py-6 bg-blue-600 text-white font-black rounded-3xl shadow-xl flex flex-col items-center justify-center gap-3 uppercase text-xs hover:bg-blue-700 transition-all active:scale-95">
                  <Camera size={32} /> Câmera do Dispositivo
                </button>
                <input id="camera-input" type="file" onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />

                <button onClick={() => { setCaptureMethod('upload'); const input = document.getElementById('gallery-input'); if (input) input.click(); }} className="flex-1 py-6 bg-slate-100 text-slate-600 font-black rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-3 uppercase text-xs hover:bg-slate-200 transition-all active:scale-95">
                  <Upload size={32} /> Escolher da Galeria
                </button>
                <input id="gallery-input" type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
              </div>
              
              <button onClick={() => setStep('select')} className="mt-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-slate-700 transition-colors">
                Voltar para Seleção
              </button>
            </div>
          )}

          {step === 'next_prompt' && (
            <div className="w-full flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300 py-8">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2 shadow-inner">
                 <CheckCircle2 size={48} />
              </div>
              <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight text-center leading-tight">
                 MUITO BEM!<br/>
                 <span className="text-emerald-600">AGORA DIGITALIZE {currentDocType === 'nf' ? 'A NOTA FISCAL' : 'O TICKET LOG'}</span>
              </h4>
              <p className="text-slate-500 text-sm font-medium text-center">
                 O primeiro documento foi recebido com sucesso. Faltam apenas os dados {currentDocType === 'nf' ? 'da Nota Fiscal' : 'do Ticket Log'} para prosseguir.
              </p>
              
              <div className="w-full mt-4 flex flex-col gap-3">
                <button 
                  onClick={() => {
                     const input = document.getElementById(captureMethod === 'camera' ? 'camera-input-next' : 'gallery-input-next');
                     if (input) input.click();
                  }}
                  className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-3 uppercase text-[12px] hover:bg-blue-700 active:scale-95 transition-all"
                >
                  {captureMethod === 'camera' ? <Camera size={28} /> : <Upload size={28} />}
                  {captureMethod === 'camera' ? 'Continuar com Câmera' : 'Continuar com Upload'}
                </button>
                <button onClick={() => setStep('capture')} className="py-3 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-slate-700 transition-colors">
                  Mudar forma de captura
                </button>
              </div>

              {/* Inputs invisíveis específicos dessa tela */}
              <input id="camera-input-next" type="file" onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
              <input id="gallery-input-next" type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
            </div>
          )}

          {step === 'review' && preview && (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl mb-2 inline-block">
                Enquadramento: {getDocTitle(currentDocType)}
              </div>
              <div className="relative rounded-3xl overflow-hidden border bg-slate-50 flex items-center justify-center min-h-[300px]">
                <div className="absolute top-4 left-0 w-full text-center z-10 pointer-events-none">
                  <p className="inline-block bg-emerald-900/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-pulse">
                    Ajuste as bordas se necessário
                  </p>
                </div>
                <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} className="flex items-center justify-center bg-slate-100">
                  <img ref={imgRef} src={preview} alt="Preview" className={`max-h-[50vh] object-contain w-full transition-all duration-700 ${loading ? 'scale-[1.02] blur-[1px]' : ''}`} onLoad={(e: SyntheticEvent<HTMLImageElement>) => { setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 }); }} />
                </ReactCrop>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-center text-left">
                  <AlertCircle className="text-red-500 shrink-0" size={20} />
                  <p className="text-xs text-red-700 font-bold">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleConfirmPhoto}
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Aprovar Enquadramento
                </button>
                
                {/* Permite finalizar ignorando o segundo arquivo caso a pessoa não tenha */}
                {((currentDocType === 'nf' && !images.ticket) || (currentDocType === 'ticket' && !images.nf)) && (
                   <button 
                    onClick={handleSkipSecond}
                    disabled={loading}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] hover:bg-slate-50"
                  >
                    <SkipForward size={14} /> Aprovar e Finalizar (Ignorar o outro)
                  </button>
                )}

                <button 
                  onClick={() => { setPreview(null); setStep('capture'); }}
                  disabled={loading}
                  className="w-full py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-[10px] tracking-widest"
                >
                  Descartar e Tirar Nova Foto
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="w-full h-64 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500">
               <div className="relative">
                 <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse"></div>
                 <Cpu className="text-blue-600 relative z-10 animate-bounce" size={48} />
               </div>
               <div>
                 <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Analisando Documentos</h4>
                 <p className="text-slate-500 text-sm mt-2 font-medium">Extraindo dados com inteligência artificial...</p>
               </div>
               <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default FuelReceiptOCR;
