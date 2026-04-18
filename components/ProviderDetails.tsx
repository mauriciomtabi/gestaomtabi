
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Provider, AttendanceRecord, AuditLog } from '../types';
import { formatMinutesToHHMM, formatDateBR, getDayOfWeekBR, getLatestVisit, calculateDuration, sanitizeObservations } from '../utils/timeUtils';
import { ArrowLeft, Scan, Calendar, History, MapPin, Phone, Eye, Edit2, Trash2, X, Check, FileText, Download, Plus, Clock, LogOut, AlertCircle, Save, Upload, RefreshCw, File, ListFilter, ClipboardCheck, ShieldCheck, FileCheck, Edit3, Target, Gauge as GaugeIcon, ChevronLeft, ChevronRight, FileWarning, ZoomIn, ZoomOut, RotateCcw, ScanFace, Filter } from 'lucide-react';
import AttendanceSheetOCR from './AttendanceSheetOCR';
import FaceEnrollment from './FaceEnrollment';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
  provider: Provider;
  attendance: AttendanceRecord[];
  onBack: () => void;
  onUpdateAttendance: (records: AttendanceRecord[]) => void;
  onDeleteAttendance?: (id: string) => void;
  onUpdateProvider?: (provider: Provider) => void;
  onEditProvider?: (provider: Provider) => void;
  currentUser?: string;
  setNotification?: (message: string, type: 'success' | 'error') => void;
}

const Speedometer = ({ percentage, value, label }: { percentage: number; value: string; label: string }) => {
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const arcLength = circumference / 2;
  const strokeDashoffset = arcLength - (Math.min(100, percentage) / 100) * arcLength;

  return (
    <div className="relative flex flex-col items-center justify-center h-40 w-full max-w-[200px] mx-auto">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-180 drop-shadow-sm"
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
      >
        <circle
          stroke="#f1f5f9"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          style={{ strokeLinecap: 'round' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#gauge-gradient-small)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          style={{ 
            strokeDashoffset, 
            transition: 'stroke-dashoffset 1.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            strokeLinecap: 'round'
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <defs>
          <linearGradient id="gauge-gradient-small" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
        <span className="text-2xl font-black text-slate-800 tracking-tighter tabular-nums">{value}</span>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</span>
      </div>
      <div className="absolute bottom-4 flex justify-between w-full px-6 text-[8px] font-black text-slate-300 uppercase tracking-widest">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
};

const ATTENDANCE_ITEMS_PER_PAGE = 50;

const ProviderDetails: React.FC<Props> = ({ provider, attendance, onBack, onUpdateAttendance, onDeleteAttendance, onUpdateProvider, onEditProvider, currentUser = "Operador", setNotification }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'history'>('attendance');
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isJustificationOpen, setIsJustificationOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<AttendanceRecord | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [viewingReturnDoc, setViewingReturnDoc] = useState<string | null>(null);
  const [viewingGeneralDoc, setViewingGeneralDoc] = useState<{ title: string; data: string } | null>(null);
  const [isFaceEnrollOpen, setIsFaceEnrollOpen] = useState(false);
  const [hasFaceDescriptor, setHasFaceDescriptor] = useState(false);

  useEffect(() => {
    // Scroll to top when opening a provider
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Check if this provider already has a face descriptor registered
    import('../services/supabaseService').then(({ getFaceDescriptors }) => {
      getFaceDescriptors().then(descriptors => {
        setHasFaceDescriptor(descriptors.some(d => d.provider_id === provider.id));
      }).catch(() => {});
    });
  }, [provider.id]);
  
  const handleDownload = async (dataUrl: string, filename: string) => {
    try {
      let blob;
      if (dataUrl.startsWith('data:')) {
        const parts = dataUrl.split(';base64,');
        if (parts.length !== 2) throw new Error("Invalid base64 data");
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        blob = new Blob([uInt8Array], { type: contentType });
      } else {
        const response = await fetch(dataUrl);
        blob = await response.blob();
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error("Erro ao baixar arquivo:", err);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetZoom = () => setZoomScale(1);
  const zoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 4));
  const zoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0.5));
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AttendanceRecord>>({});
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [attendancePage, setAttendancePage] = useState(1);
  const [selectedYear, setSelectedYear] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  
  const months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];
  
  const returnFileInputRef = useRef<HTMLInputElement>(null);
  const justificationFileInputRef = useRef<HTMLInputElement>(null);

  const [returnForm, setReturnForm] = useState({ reason: '', attachment: '', attachmentName: '', attachmentType: '' });
  const [reactivateForm, setReactivateForm] = useState({ reason: '' });
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split('T')[0],
    entryTime: '08:00',
    exitTime: '12:00'
  });
  const [justificationForm, setJustificationForm] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: '',
    attachment: '',
    attachmentName: ''
  });

  const totalWorkedMinutes = attendance.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  const totalRequiredMinutes = (provider.totalHoursToFulfill || 40) * 60;
  const remainingMinutes = Math.max(0, totalRequiredMinutes - totalWorkedMinutes);
  const progressPercent = Math.min(100, (totalWorkedMinutes / totalRequiredMinutes) * 100);
  const lastVisit = getLatestVisit(attendance);

  const availableYears = useMemo(() => {
    const years = attendance
      .map(a => a.date?.split('-')[0])
      .filter((y): y is string => !!y);
    return Array.from(new Set(years)).sort((a: string, b: string) => b.localeCompare(a));
  }, [attendance]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      if (!a.date) return false;
      const [aYear, aMonth] = a.date.split('-');
      const matchesYear = selectedYear === 'Todos' || aYear === selectedYear;
      const matchesMonth = selectedMonth === 'Todos' || aMonth === selectedMonth;
      return matchesYear && matchesMonth;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, selectedYear, selectedMonth]);

  const isFiltered = selectedYear !== 'Todos' || selectedMonth !== 'Todos';
  const filteredWorkedMinutes = filteredAttendance.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  const displayedWorkedMinutes = isFiltered ? filteredWorkedMinutes : totalWorkedMinutes;

  const attendanceTotalPages = Math.ceil(filteredAttendance.length / ATTENDANCE_ITEMS_PER_PAGE);
  const paginatedAttendance = useMemo(() => {
    return filteredAttendance.slice(
      (attendancePage - 1) * ATTENDANCE_ITEMS_PER_PAGE,
      attendancePage * ATTENDANCE_ITEMS_PER_PAGE
    );
  }, [filteredAttendance, attendancePage]);

  const createAuditLog = (action: AuditLog['action'], details: string): AuditLog => ({
    id: 'temp-' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    userName: currentUser || 'Operador',
    action,
    details
  });

  const startEditing = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setEditForm({ ...record });
    setConfirmDeleteId(null);
  };

  const saveEdit = () => {
    if (!editingId || !editForm.date) return;
    const oldRecord = attendance.find(a => a.id === editingId);
    if (!oldRecord) return;
    
    let duration = 0;
    if (editForm.type !== 'justification') {
      duration = calculateDuration(editForm.entryTime || '00:00', editForm.exitTime || '00:00');
    }

    const updated = attendance.map(a => a.id === editingId ? { ...a, ...editForm, durationMinutes: duration } as AttendanceRecord : a);
    if (onUpdateProvider) {
      const details = `Edição de registro (${formatDateBR(editForm.date || '')})`;
      onUpdateProvider({ ...provider, history: [createAuditLog('EDIÇÃO', details), ...(provider.history || [])] });
    }
    onUpdateAttendance(updated);
    if (setNotification) setNotification("Registro atualizado com sucesso!", "success");
    setEditingId(null);
  };

  const deleteRecord = (id: string) => {
    const recordToDelete = attendance.find(a => a.id === id);
    if (!recordToDelete) return;
    if (onUpdateProvider) {
      const details = `Exclusão de registro: ${formatDateBR(recordToDelete.date)}`;
      onUpdateProvider({ ...provider, history: [createAuditLog('EDIÇÃO', details), ...(provider.history || [])] });
    }
    if (onDeleteAttendance) onDeleteAttendance(id);
    if (setNotification) setNotification("Registro excluído com sucesso!", "success");
    setConfirmDeleteId(null);
  };

  const isRecordDuplicate = (date: string, entry?: string, exit?: string, type: string = 'presence') => {
    return attendance.some(a => {
      if (a.date !== date) return false;
      // Se já existe uma justificativa ou estamos tentando lançar uma, o dia está ocupado
      if (a.type === 'justification' || type === 'justification') return true;
      // Para presença, checamos se o par entrada/saída é idêntico
      return a.entryTime === entry && a.exitTime === exit;
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRecordDuplicate(manualForm.date, manualForm.entryTime, manualForm.exitTime, 'presence')) {
      if (setNotification) setNotification(`Já existe um lançamento idêntico para o dia ${formatDateBR(manualForm.date)}`, "error");
      return;
    }

    const duration = calculateDuration(manualForm.entryTime, manualForm.exitTime);
    const newRecord: AttendanceRecord = {
      id: 'manual-' + Math.random().toString(36).substr(2, 9),
      providerId: provider.id,
      date: manualForm.date,
      entryTime: manualForm.entryTime,
      exitTime: manualForm.exitTime,
      durationMinutes: duration,
      type: 'presence'
    };
    if (onUpdateProvider) {
      const log = createAuditLog('PRESENÇA', `Lançamento manual: ${formatDateBR(manualForm.date)} das ${manualForm.entryTime} às ${manualForm.exitTime}`);
      onUpdateProvider({ ...provider, history: [log, ...(provider.history || [])] });
    }
    onUpdateAttendance([...attendance, newRecord]);
    if (setNotification) setNotification("Lançamento manual realizado!", "success");
    setIsManualEntryOpen(false);
    setAttendancePage(1);
  };

  const handleJustificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isRecordDuplicate(justificationForm.date, '', '', 'justification')) {
      if (setNotification) setNotification(`Já existe um lançamento (presença ou justificativa) para o dia ${formatDateBR(justificationForm.date)}`, "error");
      return;
    }

    const newRecord: AttendanceRecord = {
      id: 'justified-' + Math.random().toString(36).substr(2, 9),
      providerId: provider.id,
      date: justificationForm.date,
      entryTime: '',
      exitTime: '',
      durationMinutes: 0,
      type: 'justification',
      reason: justificationForm.reason,
      attachmentData: justificationForm.attachment,
      attachmentType: 'image/jpeg'
    };
    if (onUpdateProvider) {
      const log = createAuditLog('JUSTIFICATIVA', `Falta justificada: ${formatDateBR(justificationForm.date)}. Motivo: ${justificationForm.reason}`);
      onUpdateProvider({ ...provider, history: [log, ...(provider.history || [])] });
    }
    
    // Adiciona ao estado local e dispara a atualização para o Supabase
    onUpdateAttendance([...attendance, newRecord]);
    if (setNotification) setNotification("Justificativa salva com sucesso!", "success");
    
    setIsJustificationOpen(false);
    setJustificationForm({ date: new Date().toISOString().split('T')[0], reason: '', attachment: '', attachmentName: '' });
    setAttendancePage(1);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateProvider) return;
    const log = createAuditLog('DEVOLUÇÃO', `Motivo: ${returnForm.reason}`);
    onUpdateProvider({ ...provider, status: 'returned', returnReason: returnForm.reason, returnAttachment: returnForm.attachment, history: [log, ...(provider.history || [])] });
    if (setNotification) setNotification("Prestador devolvido ao fórum.", "success");
    setIsReturnModalOpen(false);
    setReturnForm({ reason: '', attachment: '', attachmentName: '', attachmentType: '' });
  };

  const handleReactivateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateProvider) return;
    const log = createAuditLog('REATIVAÇÃO', `Motivo: ${reactivateForm.reason}`);
    onUpdateProvider({ ...provider, status: 'active', returnReason: undefined, returnAttachment: undefined, history: [log, ...(provider.history || [])] });
    if (setNotification) setNotification("Cadastro reativado com sucesso!", "success");
    setIsReactivateModalOpen(false);
    setReactivateForm({ reason: '' });
  };

  const handleCompleteSubmit = () => {
    if (!onUpdateProvider) return;
    const log = createAuditLog('STATUS_ALTERADO', `Prestador marcado como CONCLUÍDO manualmente.`);
    onUpdateProvider({ ...provider, status: 'completed', history: [log, ...(provider.history || [])] });
    if (setNotification) setNotification("Prestador marcado como concluído!", "success");
    setIsCompleteModalOpen(false);
  };

  const handleOcrExtracted = (recs: AttendanceRecord[]) => {
    // Filtrar registros que já existem para evitar duplicidade (checa data + horários)
    const newRecs = recs.filter(r => !isRecordDuplicate(r.date, r.entryTime, r.exitTime, 'presence'));
    const duplicatesCount = recs.length - newRecs.length;

    if (newRecs.length === 0) {
      if (setNotification) setNotification("Todos os registros digitalizados já constam no sistema.", "error");
      setIsOcrOpen(false);
      return;
    }

    if (onUpdateProvider) {
      const details = newRecs.length === 1 ? `Lançamento via Digitalização: ${formatDateBR(newRecs[0].date)}` : `Lançamento via Digitalização: ${newRecs.length} dias registrados`;
      onUpdateProvider({ ...provider, history: [createAuditLog('PRESENÇA', details), ...(provider.history || [])] });
    }
    onUpdateAttendance([...attendance, ...newRecs]);
    
    if (duplicatesCount > 0) {
      if (setNotification) setNotification(`${newRecs.length} novos registros salvos. ${duplicatesCount} duplicados foram ignorados.`, "success");
    } else {
      if (setNotification) setNotification(`${newRecs.length} registros extraídos com sucesso!`, "success");
    }
    
    setIsOcrOpen(false);
    setAttendancePage(1);
  };

  const convertPdfToImage = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Contexto não encontrado');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/png');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'return' | 'justification') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingFile(true);
    try {
      const base64 = file.type === 'application/pdf' ? await convertPdfToImage(file) : await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      if (type === 'return') {
        setReturnForm(prev => ({ ...prev, attachment: base64, attachmentName: file.name, attachmentType: file.type }));
      } else {
        setJustificationForm(prev => ({ ...prev, attachment: base64, attachmentName: file.name }));
      }
    } catch (err) { alert("Erro ao processar arquivo."); } finally { setIsProcessingFile(false); }
  };

  const getStatusLabel = (status: Provider['status']) => {
    switch(status) {
      case 'active': return 'ATIVO';
      case 'completed': return 'FINALIZADO';
      case 'suspended': return 'SUSPENSO';
      case 'returned': return 'DEVOLVIDO';
      default: return (status as any).toUpperCase();
    }
  };

  const inputClasses = "w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm shadow-inner";
  const editInputClasses = "w-full px-2 py-1 rounded border border-slate-300 bg-white text-slate-900 text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-sm";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20 md:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm bg-white/50 px-4 py-2 rounded-xl border border-slate-100 w-fit">
          <ArrowLeft size={18} />
          Voltar para Lista
        </button>
        <div className="flex gap-2">
          {onEditProvider && <button onClick={() => onEditProvider(provider)} className="flex items-center gap-2 text-blue-600 hover:text-white hover:bg-blue-600 transition-all font-black text-xs px-4 py-2 rounded-xl border border-blue-200 bg-white shadow-sm"><Edit3 size={16} />Cadastro</button>}
          {provider.status === 'active' && <button onClick={() => setIsCompleteModalOpen(true)} className="flex items-center gap-2 text-emerald-600 hover:text-white hover:bg-emerald-600 transition-all font-black text-xs px-4 py-2 rounded-xl border border-emerald-200 bg-white shadow-sm"><Check size={16} />Concluir</button>}
          {provider.status === 'returned' && <button onClick={() => setIsReactivateModalOpen(true)} className="flex items-center gap-2 text-green-600 hover:text-white hover:bg-green-600 transition-all font-black text-xs px-4 py-2 rounded-xl border border-green-200 bg-white shadow-sm"><RefreshCw size={16} />Reativar</button>}
          {provider.status !== 'returned' && provider.status !== 'completed' && <button onClick={() => setIsReturnModalOpen(true)} className="flex items-center gap-2 text-red-600 hover:text-white hover:bg-red-600 transition-all font-black text-xs px-4 py-2 rounded-xl border border-red-200 bg-white"><LogOut size={16} />Devolver</button>}
        </div>
      </div>

      {provider.status === 'returned' && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex flex-col md:flex-row gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-600 p-3 rounded-2xl text-white shrink-0 h-fit"><AlertCircle size={24} /></div>
          <div className="flex-1"><h4 className="font-black text-red-800 text-lg uppercase">Prestador Devolvido ao Fórum</h4><p className="text-red-700 text-sm mt-1 font-medium leading-relaxed"><strong>Justificativa:</strong> {provider.returnReason || 'Não informado'}</p>{provider.returnAttachment && <button onClick={() => setViewingReturnDoc(provider.returnAttachment!)} className="mt-4 flex items-center gap-2 text-red-600 bg-white px-4 py-2 rounded-xl border border-red-200 text-[10px] font-black hover:bg-red-50 transition-all shadow-sm">VISUALIZAR DOCUMENTO</button>}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
            <div className={`p-6 md:p-8 text-white relative bg-gradient-to-br ${provider.status === 'active' ? 'from-blue-700 to-blue-900' : provider.status === 'returned' ? 'from-slate-700 to-slate-900' : 'from-green-700 to-green-900'} flex items-center gap-6`}>
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] border-4 border-white/20 shadow-2xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                {provider.profilePhoto ? (
                  <img src={provider.profilePhoto} alt={provider.name || 'Prestador'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl md:text-5xl font-black">{(provider.name || '?').charAt(0)}</span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter leading-tight">{provider.name || 'Sem Nome'}</h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-white/20 px-3 py-1.5 rounded-xl text-[9px] font-mono border border-white/10 uppercase font-black">PROC: {provider.processNumber || '-'}</span>
                  <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border flex items-center gap-1.5 ${provider.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}><div className={`w-1.5 h-1.5 rounded-full animate-pulse ${provider.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></div>{getStatusLabel(provider.status)}</span>
                  <button
                    onClick={() => setIsFaceEnrollOpen(true)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border flex items-center gap-1.5 transition-all ${
                      hasFaceDescriptor
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <ScanFace size={12} />
                    {hasFaceDescriptor ? 'Rosto Cadastrado ✓' : 'Cadastrar Rosto'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 md:p-8 space-y-8 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>Perfil do Prestador</h3>
                  <div className="space-y-4">
                    {[ 
                      { icon: MapPin, label: "Endereço", val: provider.address || '-' }, 
                      { icon: Phone, label: "Telefone", val: provider.phone || '-' }, 
                      { icon: History, label: "Última Presença", val: <strong className="text-blue-900 font-black">{formatDateBR(lastVisit)}</strong> } 
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-4 text-slate-600 group">
                        <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 shadow-sm border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all"><item.icon size={18} /></div>
                        <div><span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">{item.label}</span><span className="text-xs font-bold text-slate-800 leading-snug">{item.val}</span></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>Documentação</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      {provider.identityDoc && <button onClick={() => setViewingGeneralDoc({ title: 'Documento de Identidade', data: provider.identityDoc! })} className="flex items-center gap-3 text-[10px] font-black uppercase px-4 py-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200 shadow-sm"><ShieldCheck size={18} className="text-green-600" />Ver Identidade</button>}
                      {provider.referralDoc && <button onClick={() => setViewingGeneralDoc({ title: 'Folha de Encaminhamento', data: provider.referralDoc! })} className="flex items-center gap-3 text-[10px] font-black uppercase px-4 py-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200 shadow-sm"><FileCheck size={18} className="text-blue-600" />Encaminhamento</button>}
                    </div>
                    {provider.observations && <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100 italic font-medium text-slate-600 text-[11px] leading-relaxed">"{sanitizeObservations(provider.observations)}"</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col justify-between h-full space-y-8 bg-slate-50/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><GaugeIcon size={16} className="text-blue-600" />Progressão Operacional</h3>
              <div className="font-black text-sm text-blue-700 bg-blue-100 px-3 py-1 rounded-xl border border-blue-200 shadow-sm">{Math.round(progressPercent)}%</div>
            </div>

            <div className="flex flex-col items-center">
              <Speedometer percentage={progressPercent} value={formatMinutesToHHMM(displayedWorkedMinutes)} label={isFiltered ? "Horas do Período" : "Horas Cumpridas"} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "TOTAL", val: `${(provider.totalHoursToFulfill || 0)}h`, col: "text-slate-800", bg: "bg-white" },
                { label: isFiltered ? "FEITO (PERÍODO)" : "FEITO", val: formatMinutesToHHMM(displayedWorkedMinutes), col: "text-emerald-700", bg: "bg-emerald-50", b: "border-emerald-100" },
                { label: "SALDO", val: formatMinutesToHHMM(remainingMinutes), col: "text-red-700", bg: "bg-red-50", b: "border-red-100" }
              ].map((stat, i) => (
                <div key={i} className={`${stat.bg} ${stat.b || 'border-slate-100'} p-3 rounded-2xl border flex flex-col items-center justify-center text-center shadow-sm`}>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">{stat.label}</span>
                  <span className={`text-base font-black ${stat.col} tracking-tight`}>{stat.val}</span>
                </div>
              ))}
            </div>

            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden border-2 border-white shadow-sm">
              <div className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button onClick={() => setActiveTab('attendance')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'attendance' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-400 hover:bg-slate-100'}`}><Calendar size={16} /> Lançamentos</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'history' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-400 hover:bg-slate-100'}`}><ListFilter size={16} /> Auditoria</button>
        </div>
        
        {activeTab === 'attendance' ? (
          <div className="divide-y divide-slate-100">
            <div className="p-5 flex flex-wrap sm:flex-row justify-between items-center gap-3 bg-white">
              <h3 className="hidden sm:block text-base font-black text-slate-800 uppercase tracking-tight">Registro de Frequência</h3>
              {provider.status === 'active' && (
                <div className="flex w-full sm:w-auto gap-2 justify-center">
                  <button 
                    onClick={() => setIsJustificationOpen(true)} 
                    title="Justificativa"
                    className="flex-1 sm:flex-none bg-white text-amber-600 border border-amber-600 p-2.5 sm:px-4 sm:py-2.5 rounded-xl hover:bg-amber-50 transition-all flex items-center justify-center gap-2 text-[10px] font-black shadow-sm"
                  >
                    <FileWarning size={16} /> <span className="hidden sm:inline">Justificativa</span>
                  </button>
                  <button 
                    onClick={() => setIsManualEntryOpen(true)} 
                    title="Manual"
                    className="flex-1 sm:flex-none bg-white text-blue-600 border border-blue-600 p-2.5 sm:px-4 sm:py-2.5 rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-[10px] font-black shadow-sm"
                  >
                    <Plus size={16} /> <span className="hidden sm:inline">Manual</span>
                  </button>
                  <button 
                    onClick={() => setIsOcrOpen(true)} 
                    title="Digitalizar"
                    className="flex-1 sm:flex-none bg-blue-600 text-white p-2.5 sm:px-4 sm:py-2.5 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-[10px] font-black shadow-lg shadow-blue-500/30"
                  >
                    <Scan size={16} /> <span className="hidden sm:inline">Digitalizar</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filtros de Período */}
            <div className="px-5 pb-5 bg-white border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Filtro de Período:</span>
                </div>
                
                <div className="flex gap-2 flex-wrap flex-1">
                  <select 
                    value={selectedYear} 
                    onChange={(e) => { setSelectedYear(e.target.value); setAttendancePage(1); }}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[100px]"
                  >
                    <option value="Todos">Ano: Todos</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>

                  <select 
                    value={selectedMonth} 
                    onChange={(e) => { setSelectedMonth(e.target.value); setAttendancePage(1); }}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[110px]"
                  >
                    <option value="Todos">Mês: Todos</option>
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  {(selectedYear !== 'Todos' || selectedMonth !== 'Todos') && (
                    <button 
                      onClick={() => { setSelectedYear('Todos'); setSelectedMonth('Todos'); setAttendancePage(1); }}
                      className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase px-3 py-1.5 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      Limpar Filtro
                    </button>
                  )}
                </div>
                
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                  {filteredAttendance.length} {filteredAttendance.length === 1 ? 'registro' : 'registros'}
                </div>
              </div>
            </div>

            {filteredAttendance.length === 0 ? (
              <div className="p-20 text-center opacity-30 flex flex-col items-center gap-3">
                <Calendar size={48} className="text-slate-400" />
                <p className="font-black uppercase tracking-widest text-[10px] text-slate-800">Sem registros para o período</p>
              </div>
            ) : (
              <div className="bg-white">
                <div className="hidden md:grid md:grid-cols-5 bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest px-8 py-4 border-b border-slate-100">
                  <div className="text-center">Data</div>
                  <div className="text-center">Entrada</div>
                  <div className="text-center">Saída</div>
                  <div className="text-center">Tempo</div>
                  <div className="text-right">Ações</div>
                </div>

                <div className="divide-y divide-slate-50">
                  {paginatedAttendance.map((record) => (
                    <div 
                      key={record.id} 
                      className={`p-5 md:px-8 md:py-4 hover:bg-slate-50/80 transition-colors animate-in fade-in duration-300 ${editingId === record.id ? 'bg-blue-50/50' : ''} ${record.type === 'justification' ? 'bg-amber-50/40 border-l-4 border-amber-400' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-4 md:mb-0 md:grid md:grid-cols-5 md:items-center">
                        <div className="flex-1 md:text-center">
                          {editingId === record.id ? (
                            <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className={editInputClasses}/>
                          ) : (
                            <span className="text-[11px] md:text-xs font-bold text-slate-700 tabular-nums">
                              {formatDateBR(record.date)} <span className="text-[10px] text-slate-400 font-medium">({getDayOfWeekBR(record.date)})</span>
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-[2] md:col-span-2 text-center">
                          {record.type === 'justification' ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="text-amber-800 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 py-1 px-3 bg-amber-200/50 rounded-full border border-amber-300">
                                <FileWarning size={12} /> Falta Justificada
                              </span>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-4">
                              <div className="flex-1 text-center">
                                {editingId === record.id ? (
                                  <input type="time" value={editForm.entryTime} onChange={e => setEditForm({...editForm, entryTime: e.target.value})} className={editInputClasses}/>
                                ) : (
                                  <span className="text-slate-600 font-bold bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] md:text-xs tabular-nums">{record.entryTime}</span>
                                )}
                              </div>
                              <div className="flex-1 text-center">
                                {editingId === record.id ? (
                                  <input type="time" value={editForm.exitTime} onChange={e => setEditForm({...editForm, exitTime: e.target.value})} className={editInputClasses}/>
                                ) : (
                                  <span className="text-slate-600 font-bold bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] md:text-xs tabular-nums">{record.exitTime}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="hidden md:flex justify-center">
                          {record.type === 'justification' ? (
                            <span className="font-black text-slate-400 text-[9px] italic">AUSENTE</span>
                          ) : (
                            <span className="font-black text-blue-700 bg-blue-100 px-3 py-1 rounded-full text-[10px] border border-blue-200">
                              {formatMinutesToHHMM(record.durationMinutes || 0)}
                            </span>
                          )}
                        </div>
                        
                        <div className="hidden md:flex justify-end items-center gap-2">
                          <ActionButtons record={record} editingId={editingId} editForm={editForm} setEditForm={setEditForm} saveEdit={saveEdit} setEditingId={setEditingId} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} deleteRecord={deleteRecord} startEditing={startEditing} setViewingAttachment={setViewingAttachment} providerStatus={provider.status} />
                        </div>
                      </div>
                      
                      {record.type === 'justification' && record.reason && (
                        <div className="mt-2 text-[10px] text-amber-900 font-bold italic bg-white/50 p-2 rounded-xl border border-amber-100/50">
                          Motivo: {record.reason}
                        </div>
                      )}

                      <div className="flex items-center justify-between md:hidden pt-3 border-t border-slate-100 mt-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase ${record.type === 'justification' ? 'text-amber-800 bg-amber-100 border-amber-200' : 'text-blue-700 bg-blue-50 border-blue-100'}`}>
                          {record.type === 'justification' ? 'JUSTIFICATIVA' : `Tempo: ${formatMinutesToHHMM(record.durationMinutes || 0)}`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <ActionButtons record={record} editingId={editingId} editForm={editForm} setEditForm={setEditForm} saveEdit={saveEdit} setEditingId={setEditingId} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} deleteRecord={deleteRecord} startEditing={startEditing} setViewingAttachment={setViewingAttachment} providerStatus={provider.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {attendanceTotalPages > 1 && (
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Página {attendancePage} de {attendanceTotalPages}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setAttendancePage(prev => Math.max(1, prev - 1))}
                        disabled={attendancePage === 1}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        onClick={() => setAttendancePage(prev => Math.min(attendanceTotalPages, prev + 1))}
                        disabled={attendancePage === attendanceTotalPages}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 md:p-12 max-w-4xl mx-auto">
            <div className="space-y-8 relative">
              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-100"></div>
              {(provider.history || []).length === 0 ? (
                <p className="text-center text-slate-400 italic py-8">Nenhum log encontrado.</p>
              ) : (
                provider.history.map((log) => (
                  <div key={log.id} className="relative pl-12">
                    <div className={`absolute left-0 top-0 w-10 h-10 rounded-xl flex items-center justify-center border-4 border-white shadow-sm z-10 ${log.action === 'CADASTRO' ? 'bg-blue-600 text-white' : log.action === 'DEVOLUÇÃO' ? 'bg-red-600 text-white' : log.action === 'REATIVAÇÃO' ? 'bg-green-600 text-white' : log.action === 'EDIÇÃO' ? 'bg-amber-500 text-white' : log.action === 'PRESENÇA' ? 'bg-indigo-600 text-white' : log.action === 'JUSTIFICATIVA' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-white'}`}>
                      {log.action === 'CADASTRO' ? <Plus size={18}/> : log.action === 'DEVOLUÇÃO' ? <LogOut size={18}/> : log.action === 'REATIVAÇÃO' ? <RefreshCw size={18}/> : log.action === 'EDIÇÃO' ? <Edit3 size={18}/> : log.action === 'PRESENÇA' ? <ClipboardCheck size={18}/> : log.action === 'JUSTIFICATIVA' ? <FileWarning size={18}/> : <FileText size={18}/>}
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 mb-3">
                        <h4 className="font-black text-slate-800 text-xs tracking-tight uppercase">{log.action === 'PRESENÇA' ? 'REGISTRO DE FREQUÊNCIA' : log.action === 'JUSTIFICATIVA' ? 'FALTA JUSTIFICADA' : log.action}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase tracking-widest">{log.userName}</span>
                          <div className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString('pt-BR')}</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{log.details}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {isManualEntryOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50"><h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Lançamento Manual</h3><button onClick={() => setIsManualEntryOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button></div>
            <form onSubmit={handleManualSubmit} className="p-6 space-y-6"><div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Data do Registro</label><input type="date" required value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} className={inputClasses}/></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Entrada</label><input type="time" required value={manualForm.entryTime} onChange={e => setManualForm({...manualForm, entryTime: e.target.value})} className={inputClasses}/></div><div><label className="text-[10px) font-black text-slate-400 uppercase mb-2 block tracking-widest">Saída</label><input type="time" required value={manualForm.exitTime} onChange={e => setManualForm({...manualForm, exitTime: e.target.value})} className={inputClasses}/></div></div><button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all text-xs uppercase tracking-widest">Salvar Lançamento</button></form>
          </div>
        </div>
      )}

      {isJustificationOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b flex justify-between items-center bg-amber-50/50"><h3 className="font-black text-amber-800 uppercase tracking-tight text-sm">Justificativa de Falta</h3><button onClick={() => setIsJustificationOpen(false)} className="p-2 hover:bg-amber-100 rounded-full transition-colors"><X size={20}/></button></div>
            <form onSubmit={handleJustificationSubmit} className="p-6 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Data da Falta</label>
                <input type="date" required value={justificationForm.date} onChange={e => setJustificationForm({...justificationForm, date: e.target.value})} className={inputClasses}/>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Motivo / Descrição</label>
                <textarea required rows={3} value={justificationForm.reason} onChange={e => setJustificationForm({...justificationForm, reason: e.target.value})} className={inputClasses + " resize-none"} placeholder="Ex: Atestado médico, falecimento em família..."/>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Documento Comprobatório</label>
                <button type="button" onClick={() => justificationFileInputRef.current?.click()} className="w-full py-6 border-4 border-dashed border-slate-100 rounded-[2rem] text-slate-400 hover:bg-slate-50 flex flex-col items-center justify-center gap-2 transition-all">
                  <Upload size={24} className="text-amber-400"/>
                  <span className="text-[8px] font-black uppercase tracking-widest">Anexar Documento</span>
                </button>
                <input type="file" ref={justificationFileInputRef} onChange={(e) => handleFileChange(e, 'justification')} accept="image/*,application/pdf" className="hidden"/>
                {justificationForm.attachmentName && <div className="p-2 bg-amber-50 rounded-xl border border-amber-100 text-[8px] font-black text-amber-700 truncate text-center uppercase tracking-widest">{justificationForm.attachmentName}</div>}
              </div>
              <button type="submit" disabled={isProcessingFile} className="w-full py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl hover:bg-amber-700 active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50">
                Salvar Justificativa
              </button>
            </form>
          </div>
        </div>
      )}

      {isReturnModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-red-50/50"><h3 className="font-black text-red-800 uppercase tracking-tight text-sm">Devolver ao Fórum</h3><button onClick={() => setIsReturnModalOpen(false)} className="p-2 hover:bg-red-100 rounded-full text-red-400 transition-colors"><X size={20}/></button></div>
            <form onSubmit={handleReturnSubmit} className="p-8 space-y-6"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Motivo da Devolução</label><textarea required rows={4} value={returnForm.reason} onChange={e => setReturnForm({...returnForm, reason: e.target.value})} className={inputClasses + " resize-none min-h-[100px]"} placeholder="Explique o motivo do encerramento precoce..."/></div><div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Documento de Baixa</label><button type="button" onClick={() => returnFileInputRef.current?.click()} className="w-full py-6 border-4 border-dashed border-slate-100 rounded-[2rem] text-slate-400 hover:bg-slate-50 flex flex-col items-center justify-center gap-2 transition-all"><Upload size={24} className="text-red-400"/><span className="text-[8px] font-black uppercase tracking-widest">PDF ou Imagem</span></button><input type="file" ref={returnFileInputRef} onChange={(e) => handleFileChange(e, 'return')} accept="image/*,application/pdf" className="hidden"/>{returnForm.attachment && <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[8px] font-black text-slate-500 truncate text-center uppercase tracking-widest">{returnForm.attachmentName}</div>}</div><button type="submit" disabled={isProcessingFile} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl hover:bg-red-700 active:scale-95 disabled:opacity-50 uppercase text-[10px] tracking-widest">Efetivar Baixa</button></form>
          </div>
        </div>
      )}

      {viewingGeneralDoc && (
        <div className="fixed inset-0 bg-slate-950/95 z-[3000] flex flex-col backdrop-blur-xl animate-in fade-in duration-300">
          <div className="p-6 border-b flex justify-between items-center bg-black/20 backdrop-blur-md border-white/10">
            <div className="flex flex-col">
              <h3 className="font-black text-white uppercase tracking-tight text-base">{viewingGeneralDoc.title}</h3>
              <p className="text-[9px] text-white/40 font-black uppercase tracking-widest">{provider.name || 'Sem Nome'}</p>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <div className="hidden sm:flex items-center bg-white/10 rounded-2xl p-1 mr-4">
                <button onClick={zoomOut} className="p-2 text-white hover:bg-white/10 rounded-xl transition-all" title="Diminuir Zoom"><ZoomOut size={18} /></button>
                <button onClick={resetZoom} className="px-3 text-[10px] font-black text-white hover:bg-white/10 rounded-xl transition-all uppercase">{Math.round(zoomScale * 100)}%</button>
                <button onClick={zoomIn} className="p-2 text-white hover:bg-white/10 rounded-xl transition-all" title="Aumentar Zoom"><ZoomIn size={18} /></button>
                <div className="w-px h-4 bg-white/10 mx-1"></div>
                <button onClick={resetZoom} className="p-2 text-white hover:bg-white/10 rounded-xl transition-all" title="Resetar Zoom"><RotateCcw size={18} /></button>
              </div>
              <button 
                onClick={() => handleDownload(viewingGeneralDoc.data, `documento_${viewingGeneralDoc.title.toLowerCase().replace(/\s+/g, '_')}.png`)}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest mr-0 md:mr-2"
                title="Baixar"
              >
                <Download size={18} /> <span className="hidden sm:inline">Baixar</span>
              </button>
              <button onClick={() => { setViewingGeneralDoc(null); resetZoom(); }} className="p-2 md:p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20"><X size={18} className="md:w-5 md:h-5"/></button>
            </div>
          </div>
          <div className="flex-1 bg-slate-900/50 overflow-auto p-8 flex items-center justify-center">
            <div className="relative transition-transform duration-200 ease-out origin-center" style={{ transform: `scale(${zoomScale})` }} onClick={e => e.stopPropagation()}>
              <img src={viewingGeneralDoc.data} alt="Documento" className="rounded-2xl shadow-2xl border-4 border-white/10 mx-auto h-fit max-w-full"/>
            </div>
          </div>
        </div>
      )}

      {viewingReturnDoc && (
        <div className="fixed inset-0 bg-slate-950/95 z-[3000] flex flex-col backdrop-blur-xl animate-in fade-in duration-300">
          <div className="p-6 border-b flex justify-between items-center bg-black/20 backdrop-blur-md border-white/10">
            <div className="flex flex-col">
              <h3 className="font-black text-white uppercase tracking-tight text-base">Documento de Baixa / Devolução</h3>
              <p className="text-[9px] text-white/40 font-black uppercase tracking-widest">{provider.name || 'Sem Nome'}</p>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <div className="hidden sm:flex items-center bg-white/10 rounded-2xl p-1 mr-4">
                <button onClick={zoomOut} className="p-2 text-white hover:bg-white/10 rounded-xl transition-all" title="Diminuir Zoom"><ZoomOut size={18} /></button>
                <button onClick={resetZoom} className="px-3 text-[10px] font-black text-white hover:bg-white/10 rounded-xl transition-all uppercase">{Math.round(zoomScale * 100)}%</button>
                <button onClick={zoomIn} className="p-2 text-white hover:bg-white/10 rounded-xl transition-all" title="Aumentar Zoom"><ZoomIn size={18} /></button>
                <div className="w-px h-4 bg-white/10 mx-1"></div>
                <button onClick={resetZoom} className="p-2 text-white hover:bg-white/10 rounded-xl transition-all" title="Resetar Zoom"><RotateCcw size={18} /></button>
              </div>
              <button 
                onClick={() => handleDownload(viewingReturnDoc, 'documento_baixa.png')}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest mr-0 md:mr-2"
                title="Baixar"
              >
                <Download size={18} /> <span className="hidden sm:inline">Baixar</span>
              </button>
              <button onClick={() => { setViewingReturnDoc(null); resetZoom(); }} className="p-2 md:p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20"><X size={18} className="md:w-5 md:h-5"/></button>
            </div>
          </div>
          <div className="flex-1 bg-slate-900/50 overflow-auto p-8 flex items-center justify-center">
            <div className="relative transition-transform duration-200 ease-out origin-center" style={{ transform: `scale(${zoomScale})` }} onClick={e => e.stopPropagation()}>
              <img src={viewingReturnDoc} alt="Documento de Baixa" className="rounded-2xl shadow-2xl border-4 border-white/10 mx-auto h-fit max-w-full"/>
            </div>
          </div>
        </div>
      )}

      {isReactivateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-green-50/50"><h3 className="font-black text-green-800 uppercase tracking-tight text-sm">Reativar Prestador</h3><button onClick={() => setIsReactivateModalOpen(false)} className="p-2.5 hover:bg-green-100 text-green-400 transition-colors rounded-full"><X size={20}/></button></div>
            <form onSubmit={handleReactivateSubmit} className="p-8 space-y-6"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Justificativa do Retorno</label><textarea required rows={4} value={reactivateForm.reason} onChange={e => setReactivateForm({...reactivateForm, reason: e.target.value})} className={inputClasses + " resize-none min-h-[100px]"} placeholder="Descreva o parecer de reativação..."/></div><button type="submit" className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl hover:bg-green-700 active:scale-95 uppercase text-[10px] tracking-widest">Reativar Cadastro</button></form>
          </div>
        </div>
      )}

      {isCompleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Finalizar Acompanhamento?</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium">O prestador será marcado como <strong>CONCLUÍDO</strong>. Esta ação indica que todas as obrigações foram cumpridas.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsCompleteModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                <button onClick={handleCompleteSubmit} className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95">Confirmar Conclusão</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingAttachment && (
        <div className="fixed inset-0 bg-slate-950/95 z-[3000] flex flex-col backdrop-blur-xl animate-in fade-in duration-300">
          <div className="p-3 md:p-6 border-b flex justify-between items-center bg-black/20 backdrop-blur-md border-white/10">
            <div className="flex flex-col">
              <h3 className="font-black text-white uppercase tracking-tight text-xs md:text-base">Folha de Frequência Digitalizada</h3>
              <p className="text-[8px] md:text-[9px] text-white/40 font-black uppercase tracking-widest">LANÇAMENTO EM: {formatDateBR(viewingAttachment.date)}</p>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <div className="hidden sm:flex items-center bg-white/10 rounded-2xl p-1 mr-4">
                <button 
                  onClick={zoomOut}
                  className="p-2 text-white hover:bg-white/10 rounded-xl transition-all"
                  title="Diminuir Zoom"
                >
                  <ZoomOut size={18} />
                </button>
                <button 
                  onClick={resetZoom}
                  className="px-3 text-[10px] font-black text-white hover:bg-white/10 rounded-xl transition-all uppercase"
                >
                  {Math.round(zoomScale * 100)}%
                </button>
                <button 
                  onClick={zoomIn}
                  className="p-2 text-white hover:bg-white/10 rounded-xl transition-all"
                  title="Aumentar Zoom"
                >
                  <ZoomIn size={18} />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1"></div>
                <button 
                  onClick={resetZoom}
                  className="p-2 text-white hover:bg-white/10 rounded-xl transition-all"
                  title="Resetar Zoom"
                >
                  <RotateCcw size={18} />
                </button>
              </div>

              <button 
                onClick={() => handleDownload(viewingAttachment.attachmentData!, `frequencia_${viewingAttachment.date}.png`)}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Baixar</span>
              </button>

              <button onClick={() => { setViewingAttachment(null); resetZoom(); }} className="p-2 md:p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20">
                <X size={18} className="md:w-5 md:h-5"/>
              </button>
            </div>
          </div>
          <div className="flex-1 bg-slate-900/50 overflow-auto p-8 flex items-center justify-center">
            <div 
              className="relative transition-transform duration-200 ease-out origin-center"
              style={{ transform: `scale(${zoomScale})` }}
              onClick={e => e.stopPropagation()}
            >
              <img src={viewingAttachment.attachmentData} alt="Documento" className="rounded-2xl shadow-2xl border-4 border-white/10 mx-auto h-fit max-w-full"/>
            </div>
          </div>
          <div className="p-6 bg-black/20 backdrop-blur-md border-t border-white/10 flex flex-wrap justify-center gap-4">
             {(() => {
               if (!viewingAttachment.reason) return null;
               
               let locs: any = null;
               try {
                 locs = JSON.parse(viewingAttachment.reason);
               } catch(e) {
                 if (viewingAttachment.reason.startsWith('LOCATION:')) {
                   const coords = viewingAttachment.reason.split(':')[1];
                   if (coords) {
                     const [elat, elng] = coords.split(',');
                     locs = { entry: { lat: elat, lng: elng } };
                   }
                 }
               }

               return (
                 <div className="flex gap-2">
                   {locs?.entry && (
                     <a 
                       href={`https://www.google.com/maps/search/?api=1&query=${locs.entry.lat},${locs.entry.lng}`}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="px-6 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 uppercase text-[10px] tracking-widest flex items-center gap-2"
                     >
                       <MapPin size={16} />
                       Loc. Entrada
                     </a>
                   )}
                   {locs?.exit && (
                     <a 
                       href={`https://www.google.com/maps/search/?api=1&query=${locs.exit.lat},${locs.exit.lng}`}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95 uppercase text-[10px] tracking-widest flex items-center gap-2"
                     >
                       <MapPin size={16} />
                       Loc. Saída
                     </a>
                   )}
                 </div>
               );
             })()}
             <button 
              onClick={() => handleDownload(viewingAttachment.attachmentData!, `frequencia_${viewingAttachment.date}.png`)}
              className="px-8 py-3 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95 uppercase text-[10px] tracking-widest flex items-center gap-2"
            >
              <Download size={16} />
              Download Documento
            </button>
             <button 
              onClick={() => { setViewingAttachment(null); resetZoom(); }}
              className="px-8 py-3 bg-white/10 text-white font-black rounded-2xl shadow-xl hover:bg-white/20 transition-all active:scale-95 uppercase text-[10px] tracking-widest"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}

      {isOcrOpen && <AttendanceSheetOCR 
        providerId={provider.id} 
        providerName={provider.name || ''} 
        existingRecords={attendance.map(a => `${a.date}|${a.entryTime}|${a.exitTime}|${a.type}`)} 
        onExtracted={handleOcrExtracted} 
        onCancel={() => setIsOcrOpen(false)} 
      />}

      {isFaceEnrollOpen && (
        <FaceEnrollment
          provider={provider}
          hasExistingFace={hasFaceDescriptor}
          onClose={() => setIsFaceEnrollOpen(false)}
          onSuccess={(hasFace: boolean, newPhoto?: string) => {
            setIsFaceEnrollOpen(false);
            setHasFaceDescriptor(hasFace);
            if (newPhoto !== undefined && onUpdateProvider) {
              onUpdateProvider({ ...provider, profilePhoto: newPhoto });
            }
          }}
        />
      )}
    </div>
  );
};

const ActionButtons = ({ record, editingId, editForm, setEditForm, saveEdit, setEditingId, confirmDeleteId, setConfirmDeleteId, deleteRecord, startEditing, setViewingAttachment, providerStatus }: any) => {
  if (editingId === record.id) {
    return (
      <>
        <button onClick={saveEdit} className="p-2 text-green-600 hover:bg-green-100 rounded-xl border border-green-200 bg-white shadow-sm transition-all"><Check size={16}/></button>
        <button onClick={() => { setEditingId(null); setEditForm({}); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl border border-slate-200 bg-white transition-all"><X size={16}/></button>
      </>
    );
  }

  if (confirmDeleteId === record.id) {
    return (
      <div className="flex items-center gap-2 bg-red-50 p-1 px-2 rounded-xl border border-red-100 shadow-sm">
        <span className="text-[8px] font-black text-red-600 uppercase">Apagar?</span>
        <div className="flex gap-1">
          <button onClick={() => deleteRecord(record.id)} className="p-1.5 bg-red-600 text-white rounded-lg"><Check size={14}/></button>
          <button onClick={() => setConfirmDeleteId(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"><X size={14}/></button>
        </div>
      </div>
    );
  }

  return (
    <>
      {record.attachmentData && (
        <button onClick={() => setViewingAttachment(record)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition-all">
          <Eye size={18}/>
        </button>
      )}
      {providerStatus === 'active' && (
        <>
          <button onClick={() => startEditing(record)} className="p-2 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-transparent hover:border-amber-100 transition-all">
            <Edit2 size={18}/>
          </button>
          <button onClick={() => setConfirmDeleteId(record.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all">
            <Trash2 size={18}/>
          </button>
        </>
      )}
    </>
  );
};

export default ProviderDetails;
