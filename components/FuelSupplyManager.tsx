
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FuelSupply, AuditLog, Vehicle, StationNickname } from '../types';
import { getFuelSupplies, saveFuelSupply, deleteFuelSupply, saveFuelAuditLog, saveVehicle, deleteVehicle, saveStationNickname } from '../services/supabaseService';
import { Plus, Search, Filter, Calendar, MapPin, Fuel, User, Car, Hash, DollarSign, Eye, Trash2, X, Save, Loader2, Camera, FileText, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, History, Edit3, Clock, Download, ZoomIn, ZoomOut, RotateCcw, Upload, Image as ImageIcon, Tag, LayoutDashboard } from 'lucide-react';
import { normalizeFuelType, getStationDisplayName } from '../utils/fuelUtils';
import FuelReceiptOCR from './FuelReceiptOCR';
import FuelReport from './FuelReport';

interface Props {
  currentUser: string;
  vehicles: Vehicle[];
  fuelSupplies: FuelSupply[];
  stationNicknames: StationNickname[];
  onUpdateVehicles: () => void;
  onNavigateDashboard: () => void;
  setNotification: (msg: string, type: 'success' | 'error') => void;
}

const FuelSupplyManager: React.FC<Props> = ({ currentUser, vehicles, fuelSupplies, stationNicknames, onUpdateVehicles, onNavigateDashboard, setNotification }) => {
  const [supplies, setSupplies] = useState<FuelSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [mainTab, setMainTab] = useState<'records' | 'reports'>('records');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteVehicleId, setConfirmDeleteVehicleId] = useState<string | null>(null);

  const [nicknameFormData, setNicknameFormData] = useState({ originalName: '', nickname: '' });

  const nicknameMap = useMemo(() => {
    return stationNicknames.reduce((acc, curr) => {
      acc[curr.originalName] = curr.nickname;
      return acc;
    }, {} as Record<string, string>);
  }, [stationNicknames]);

  const uniqueStations = useMemo(() => {
    const stations = new Set<string>();
    supplies.forEach(s => stations.add(s.location));
    return Array.from(stations).sort((a, b) => {
      const hasA = !!nicknameMap[a];
      const hasB = !!nicknameMap[b];
      if (hasA === hasB) return a.localeCompare(b);
      return hasA ? 1 : -1; // Unmapped first
    });
  }, [supplies, nicknameMap]);

  const vehiclePhotoInputRef = useRef<HTMLInputElement>(null);

  const initialVehicleData: Partial<Vehicle> = {
    plate: '',
    fleetCode: '',
    model: '',
    brand: '',
    year: '',
    color: '',
    photo: ''
  };

  const [vehicleFormData, setVehicleFormData] = useState<Partial<Vehicle>>(initialVehicleData);

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameFormData.originalName || !nicknameFormData.nickname) return;
    setSavingNickname(true);
    try {
      await saveStationNickname(nicknameFormData.originalName, nicknameFormData.nickname);
      await onUpdateVehicles(); // Re-fetch all data including nicknames
      setNicknameFormData({ originalName: '', nickname: '' });
      setNotification("Posto salvo com sucesso!", 'success');
    } catch (err) {
      console.error("Erro ao salvar posto:", err);
      setNotification("Erro ao salvar posto.", 'error');
    } finally {
      setSavingNickname(false);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVehicle(true);
    try {
      const saved = await saveVehicle(vehicleFormData);
      await onUpdateVehicles();
      
      setVehicleFormData(initialVehicleData);
      setEditingVehicleId(null);
      
      setNotification("Veículo salvo com sucesso!", 'success');
    } catch (err) {
      console.error("Erro ao salvar veículo:", err);
      setNotification("Erro ao salvar veículo.", 'error');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicleAction = async (id: string) => {
    setConfirmDeleteVehicleId(id);
  };

  const confirmDeleteVehicle = async () => {
    if (!confirmDeleteVehicleId) return;
    try {
      await deleteVehicle(confirmDeleteVehicleId);
      await onUpdateVehicles();
      setNotification("Veículo excluído!", 'success');
    } catch (err) {
      console.error("Erro ao excluir veículo:", err);
      setNotification("Erro ao excluir veículo.", 'error');
    } finally {
      setConfirmDeleteVehicleId(null);
    }
  };

  const handleVehiclePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setVehicleFormData(prev => ({ ...prev, photo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = async (dataUrl: string) => {
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
      link.download = `nota_combustivel_${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error("Erro ao baixar arquivo:", err);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `nota_combustivel_${new Date().getTime()}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetZoom = () => setZoomScale(1);
  const zoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 4));
  const zoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0.5));
  
  const getLocalISOString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const initialFormData: Partial<FuelSupply> = {
    date: getLocalISOString(new Date()),
    location: '',
    cnpj: '',
    fuelType: '',
    liters: 0,
    pricePerLiter: 0,
    totalValue: 0,
    driver: '',
    plate: '',
    km: 0,
    attendant: '',
    protocol: ''
  };

  const [formData, setFormData] = useState<Partial<FuelSupply>>(initialFormData);
  const [showPlateSuggestions, setShowPlateSuggestions] = useState(false);

  // Helper to get a clean alphanumeric plate for comparison
  const getCleanPlate = (p: string) => p.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  // Find matching vehicle based on normalized plate
  const matchedVehicle = useMemo(() => {
    if (!formData.plate) return null;
    const cleanInput = getCleanPlate(formData.plate);
    return vehicles.find(v => getCleanPlate(v.plate) === cleanInput);
  }, [formData.plate, vehicles]);

  const filteredVehiclesForSuggestions = useMemo(() => {
    if (!formData.plate) return vehicles;
    const search = getCleanPlate(formData.plate);
    return vehicles.filter(v => 
      getCleanPlate(v.plate).includes(search) || 
      getCleanPlate(v.fleetCode).includes(search)
    );
  }, [vehicles, formData.plate]);

  useEffect(() => {
    fetchSupplies();
  }, []);

  const normalizePlate = (plate: string) => {
    const clean = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clean.length === 7) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }
    return clean;
  };

  const formatPlate = (plate: string) => {
    if (!plate) return '';
    const clean = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clean.length === 7) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }
    return plate;
  };

  const fetchSupplies = async () => {
    try {
      const data = await getFuelSupplies();
      setSupplies(data);
    } catch (err) {
      console.error("Erro ao buscar abastecimentos:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSupplies = useMemo(() => {
    return supplies.filter(s => 
      s.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.protocol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [supplies, searchTerm]);

  const handleEdit = (supply: FuelSupply) => {
    setEditingId(supply.id);
    setFormData({
      ...supply,
      // Garantir que a data esteja no formato correto para o input datetime-local
      date: supply.date.slice(0, 16)
    });
    setActiveTab('form');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicates
    const isNew = !editingId || editingId.startsWith('temp-');
    if (isNew) {
      const isDuplicate = supplies.some(s => 
        s.plate === formData.plate && 
        s.date.slice(0, 16) === formData.date?.slice(0, 16) && 
        s.totalValue === formData.totalValue
      );

      if (isDuplicate) {
        setNotification("Já existe um abastecimento idêntico (mesma placa, data e valor) registrado.", 'error');
        return;
      }

      if (formData.protocol) {
        const protocolDuplicate = supplies.some(s => s.protocol === formData.protocol);
        if (protocolDuplicate) {
          setNotification("Este número de protocolo/nota já foi utilizado em outro registro.", 'error');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const supplyToSave = { 
        ...formData, 
        fuelType: normalizeFuelType(formData.fuelType || ''),
        id: editingId || 'temp-' + Date.now() 
      } as FuelSupply;

      const savedSupply = await saveFuelSupply(supplyToSave);
      
      if (savedSupply) {
        const log: AuditLog = {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          userName: currentUser,
          action: isNew ? 'CADASTRO' : 'EDIÇÃO',
          details: isNew ? `Novo abastecimento registrado no valor de R$ ${supplyToSave.totalValue}` : `Registro de abastecimento atualizado.`
        };
        await saveFuelAuditLog(savedSupply.id, log);
      }

      await fetchSupplies();
      
      setFormData(initialFormData);
      setEditingId(null);
      setIsModalOpen(false);
      
      setNotification(isNew ? "Abastecimento registrado!" : "Registro atualizado!", 'success');
    } catch (err) {
      console.error("Erro ao salvar abastecimento:", err);
      setNotification("Erro ao salvar registro.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDeleteSupply = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteFuelSupply(confirmDeleteId);
      await fetchSupplies();
      setNotification("Registro excluído com sucesso!", 'success');
    } catch (err) {
      console.error("Erro ao excluir:", err);
      setNotification("Erro ao excluir registro.", 'error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleOcrExtracted = (supply: FuelSupply) => {
    // Try to find a matching vehicle to use the canonical plate format
    const cleanPlate = supply.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const matched = vehicles.find(v => v.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() === cleanPlate);
    
    setFormData({
      ...supply,
      plate: matched ? matched.plate : supply.plate
    });
    setIsOcrOpen(false);
    setIsModalOpen(true);
    setActiveTab('form');
  };

  const inputClasses = "w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm shadow-inner";
  const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 md:pb-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/30">
            <Fuel size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Abastecimento</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Controle de combustível e manutenção de frota.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onNavigateDashboard}
            title="Ver Painel"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-600 px-4 md:px-6 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all font-black text-xs shadow-sm active:scale-95"
          >
            <LayoutDashboard size={18} />
            <span className="hidden md:inline">Painel</span>
          </button>
          <button 
            onClick={() => setIsNicknameModalOpen(true)}
            title="Gestão de Postos"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-600 px-4 md:px-6 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all font-black text-xs shadow-sm active:scale-95"
          >
            <MapPin size={18} />
            <span className="hidden md:inline">Postos</span>
          </button>
          <button 
            onClick={() => setIsVehicleModalOpen(true)}
            title="Gestão de Frota"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-600 px-4 md:px-6 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all font-black text-xs shadow-sm active:scale-95"
          >
            <Car size={18} />
            <span className="hidden md:inline">Frota</span>
          </button>
          <button 
            onClick={() => setIsOcrOpen(true)}
            title="Digitalizar Nota Fiscal"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-blue-600 px-4 md:px-6 py-3 rounded-2xl border border-blue-100 hover:bg-blue-50 transition-all font-black text-xs shadow-sm active:scale-95"
          >
            <Camera size={18} />
            <span className="hidden md:inline">Digitalizar Nota</span>
          </button>
          <button 
            onClick={() => { setEditingId(null); setFormData(initialFormData); setIsModalOpen(true); setActiveTab('form'); }}
            title="Novo Registro de Abastecimento"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 md:px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 font-black text-xs active:scale-95"
          >
            <Plus size={18} />
            <span className="hidden md:inline">Novo Registro</span>
          </button>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="flex px-2 md:px-0 gap-2 border-b-2 border-slate-200 pb-4 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          onClick={() => setMainTab('records')}
          className={`group flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            mainTab === 'records' ? 'bg-slate-900 text-white shadow-lg scale-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 scale-95'
          }`}
        >
          <Fuel size={18} />
          Registros e Frota
        </button>
        <button
          onClick={() => setMainTab('reports')}
          className={`group flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            mainTab === 'reports' ? 'bg-amber-600 text-white shadow-lg shadow-amber-200 scale-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 scale-95'
          }`}
        >
          <FileText size={18} />
          Relatórios PDF
        </button>
      </div>

      {mainTab === 'reports' ? (
        <FuelReport 
          supplies={supplies} 
          vehicles={vehicles} 
          stationNicknames={stationNicknames} 
        />
      ) : (
        <>
          <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center mt-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por posto, motorista, placa ou protocolo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-medium"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-50 text-slate-500 rounded-2xl border border-slate-100 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">
            <Filter size={16} />
            Filtros
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[200px]">Data / Local</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[250px]">Veículo / KM</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[180px]">Motorista</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Combustível</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-[150px]">Valor Total</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={32} />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Carregando registros...</p>
                  </td>
                </tr>
              ) : filteredSupplies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Fuel className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-slate-400 font-bold italic">Nenhum abastecimento encontrado.</p>
                  </td>
                </tr>
              ) : (
                filteredSupplies.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-all group cursor-pointer" onClick={() => handleEdit(s)}>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-800 uppercase whitespace-nowrap">
                          {new Date(s.date).toLocaleDateString('pt-BR')} {new Date(s.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1 mt-1 truncate max-w-[180px]" title={s.location}>
                          <MapPin size={10} className="text-blue-500 shrink-0" />
                          <span className="truncate">{getStationDisplayName(s.location, nicknameMap)}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-14 rounded-xl bg-slate-50 overflow-hidden border-2 border-slate-200 shrink-0 shadow-sm group-hover:border-blue-400 transition-all flex items-center justify-center">
                          {vehicles.find(v => v.plate === s.plate)?.photo ? (
                            <img 
                              src={vehicles.find(v => v.plate === s.plate)?.photo} 
                              alt={s.plate} 
                              className="w-full h-full object-contain p-0.5" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
                              <Car size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-blue-700 uppercase tracking-tight whitespace-nowrap">{formatPlate(s.plate)}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1 whitespace-nowrap">
                            {vehicles.find(v => v.plate === s.plate)?.fleetCode || '-'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{s.km.toLocaleString('pt-BR')} KM</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-slate-700 uppercase">{s.driver}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{s.fuelType}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-black whitespace-nowrap">{s.liters.toLocaleString('pt-BR')} L</span>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">R$ {s.pricePerLiter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/L</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-sm font-black text-slate-900">R$ {s.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(s)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit3 size={18} />
                        </button>
                        {s.attachmentData && (
                          <button 
                            onClick={() => setViewingAttachment(s.attachmentData!)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="Ver Nota"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(s.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="bg-white p-12 rounded-[2rem] border border-slate-200 text-center">
            <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={32} />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Carregando...</p>
          </div>
        ) : filteredSupplies.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-slate-200 text-center">
            <Fuel className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-bold italic">Nenhum registro.</p>
          </div>
        ) : (
          filteredSupplies.map(s => (
            <div key={s.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 space-y-4 active:scale-[0.98] transition-all" onClick={() => handleEdit(s)}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 rounded-2xl bg-slate-50 overflow-hidden border-2 border-slate-100 shrink-0 shadow-sm flex items-center justify-center">
                    {vehicles.find(v => v.plate === s.plate)?.photo ? (
                      <img 
                        src={vehicles.find(v => v.plate === s.plate)?.photo} 
                        alt={s.plate} 
                        className="w-full h-full object-contain p-1" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
                        <Car size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {s.date.replace('T', ' ').slice(0, 16)}
                    </span>
                    <h4 className="text-sm font-black text-slate-800 uppercase mt-1 leading-tight">{getStationDisplayName(s.location, nicknameMap)}</h4>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm whitespace-nowrap">
                    {formatPlate(s.plate)}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">
                    {vehicles.find(v => v.plate === s.plate)?.fleetCode || '-'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Combustível</p>
                  <p className="text-xs font-bold text-slate-700">{s.fuelType}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{s.liters.toLocaleString('pt-BR')} L</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Total</p>
                  <p className="text-lg font-black text-slate-900">R$ {s.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                    <User size={14} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">{s.driver}</span>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  {s.attachmentData && (
                    <button onClick={() => setViewingAttachment(s.attachmentData!)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Eye size={18}/></button>
                  )}
                  <button onClick={() => handleDelete(s.id)} className="p-2.5 bg-red-50 text-red-400 rounded-xl"><Trash2 size={18}/></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[2000] flex items-center justify-center p-2 md:p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
              <div className="flex items-center gap-4">
                <h3 className="font-black text-blue-900 uppercase tracking-tight text-sm flex items-center gap-2">
                  {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
                  {editingId ? 'Editar Abastecimento' : 'Novo Abastecimento'}
                </h3>
                {editingId && (
                  <div className="flex bg-white/50 p-1 rounded-xl border border-blue-100">
                    <button 
                      onClick={() => setActiveTab('form')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'form' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-400 hover:text-blue-600'}`}
                    >
                      Dados
                    </button>
                    <button 
                      onClick={() => setActiveTab('history')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-400 hover:text-blue-600'}`}
                    >
                      Histórico
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 hover:bg-blue-100 text-blue-400 transition-colors rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'form' ? (
                <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4 md:col-span-2">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        Dados do Estabelecimento
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClasses}>Data e Hora</label>
                          <input type="datetime-local" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClasses} />
                        </div>
                        <div>
                          <label className={labelClasses}>Local / Posto</label>
                          <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className={inputClasses} placeholder="Ex: Posto Tigrão" />
                        </div>
                        <div>
                          <label className={labelClasses}>CNPJ</label>
                          <input type="text" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} className={inputClasses} placeholder="00.000.000/0000-00" />
                        </div>
                        <div>
                          <label className={labelClasses}>Protocolo / Nota</label>
                          <input type="text" value={formData.protocol} onChange={e => setFormData({...formData, protocol: e.target.value})} className={inputClasses} placeholder="Nº da Nota Fiscal" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        Combustível
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className={labelClasses}>Tipo</label>
                          <input type="text" required value={formData.fuelType} onChange={e => setFormData({...formData, fuelType: e.target.value})} className={inputClasses} placeholder="Ex: Gasolina Comum" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelClasses}>Litros</label>
                            <input type="number" step="0.001" required value={formData.liters} onChange={e => setFormData({...formData, liters: parseFloat(e.target.value)})} className={inputClasses} />
                          </div>
                          <div>
                            <label className={labelClasses}>Preço/L</label>
                            <input type="number" step="0.01" required value={formData.pricePerLiter} onChange={e => setFormData({...formData, pricePerLiter: parseFloat(e.target.value)})} className={inputClasses} />
                          </div>
                        </div>
                        <div>
                          <label className={labelClasses}>Valor Total (R$)</label>
                          <input type="number" step="0.01" required value={formData.totalValue} onChange={e => setFormData({...formData, totalValue: parseFloat(e.target.value)})} className={inputClasses + " font-black text-blue-700 bg-blue-50"} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 md:col-span-3">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        Veículo e Motorista
                      </h4>
                      
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Featured Vehicle Photo */}
                        <div className="w-full md:w-48 h-48 rounded-3xl bg-slate-50 border-2 border-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-inner group relative">
                          {matchedVehicle?.photo ? (
                            <img 
                              src={matchedVehicle.photo} 
                              alt="Veículo" 
                              className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110" 
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-300">
                              <Car size={48} strokeWidth={1.5} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Sem Foto</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="sm:col-span-2 lg:col-span-1">
                            <label className={labelClasses}>Motorista</label>
                            <input type="text" required value={formData.driver} onChange={e => setFormData({...formData, driver: e.target.value})} className={inputClasses} placeholder="Nome do Motorista" />
                          </div>
                          <div className="sm:col-span-2 lg:col-span-1">
                            <label className={labelClasses}>Placa</label>
                            <div className="relative">
                              <input 
                                type="text" 
                                required 
                                value={formData.plate} 
                                onFocus={() => setShowPlateSuggestions(true)}
                                onChange={e => {
                                  setFormData({...formData, plate: normalizePlate(e.target.value)});
                                  setShowPlateSuggestions(true);
                                }} 
                                className={inputClasses} 
                                placeholder="ABC-1D23" 
                              />
                              
                              {showPlateSuggestions && filteredVehiclesForSuggestions.length > 0 && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-[2001]" 
                                    onClick={() => setShowPlateSuggestions(false)}
                                  />
                                  <div className="absolute z-[2002] w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Veículos Cadastrados</span>
                                    </div>
                                    {filteredVehiclesForSuggestions.map(v => (
                                      <button 
                                        key={v.id}
                                        type="button"
                                        onClick={() => {
                                          setFormData({...formData, plate: v.plate});
                                          setShowPlateSuggestions(false);
                                        }}
                                        className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors group"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                            <Car size={16} />
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{v.plate}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{v.fleetCode || '-'}</span>
                                          </div>
                                        </div>
                                        <div className="text-[10px] font-black text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase">Selecionar</div>
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}

                              {matchedVehicle && !showPlateSuggestions && (
                                <div className="absolute -bottom-4 left-0">
                                  <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">
                                    Frota: {matchedVehicle.fleetCode || '-'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className={labelClasses}>KM Atual</label>
                            <input type="number" required value={formData.km} onChange={e => setFormData({...formData, km: parseInt(e.target.value)})} className={inputClasses} />
                          </div>
                          <div>
                            <label className={labelClasses}>Atendente</label>
                            <input type="text" value={formData.attendant} onChange={e => setFormData({...formData, attendant: e.target.value})} className={inputClasses} placeholder="Nome do Atendente" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex flex-col sm:flex-row gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {editingId ? 'Salvar Alterações' : 'Salvar Registro'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <History className="text-blue-600" size={20} />
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Histórico de Auditoria</h4>
                  </div>
                  <div className="space-y-4">
                    {formData.history && formData.history.length > 0 ? (
                      formData.history.map((log, idx) => (
                        <div key={idx} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                          <div className="bg-white p-2 rounded-xl shadow-sm h-fit">
                            <Clock size={16} className="text-blue-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{log.action}</span>
                              <span className="text-[10px] text-slate-400 font-bold">• {new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700 mb-1">{log.details}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operador: {log.userName}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <History size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-400 font-bold italic text-sm">Nenhum histórico registrado.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isOcrOpen && (
        <FuelReceiptOCR 
          onExtracted={handleOcrExtracted}
          onCancel={() => setIsOcrOpen(false)}
        />
      )}

      {isNicknameModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[2000] flex items-center justify-center p-2 md:p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />
                Gerenciar Postos
              </h3>
              <button onClick={() => setIsNicknameModalOpen(false)} className="p-2.5 hover:bg-slate-200 text-slate-400 transition-colors rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              <form onSubmit={handleSaveNickname} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Cadastrar Novo Posto</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>Posto Original</label>
                    <select 
                      required 
                      value={nicknameFormData.originalName} 
                      onChange={e => setNicknameFormData({...nicknameFormData, originalName: e.target.value})}
                      className={inputClasses}
                    >
                      <option value="">Selecione um posto...</option>
                      {uniqueStations.map(station => {
                        const hasNickname = !!nicknameMap[station];
                        return (
                          <option key={station} value={station}>
                            {hasNickname ? `✅ ${station}` : `⚠️ ${station}`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Nome do Posto</label>
                    <input 
                      type="text" 
                      required 
                      value={nicknameFormData.nickname} 
                      onChange={e => setNicknameFormData({...nicknameFormData, nickname: e.target.value})}
                      className={inputClasses}
                      placeholder="Ex: Posto do Centro"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={savingNickname}
                  className="w-full py-3 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {savingNickname ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar Posto
                </button>
              </form>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Postos Configurados</h4>
                <div className="grid grid-cols-1 gap-3">
                  {stationNicknames.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                      <MapPin size={32} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-slate-400 font-bold italic text-xs">Nenhum posto cadastrado.</p>
                    </div>
                  ) : (
                    stationNicknames.map(n => (
                      <div key={n.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Original: {n.originalName}</span>
                          <span className="text-sm font-black text-slate-800 uppercase mt-1">{n.nickname}</span>
                        </div>
                        <button 
                          onClick={() => setNicknameFormData({ originalName: n.originalName, nickname: n.nickname })}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[2000] flex items-center justify-center p-2 md:p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
                <Car size={18} className="text-blue-600" />
                Gestão de Frota
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)} className="p-2.5 hover:bg-slate-200 text-slate-400 transition-colors rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-5 space-y-6">
                  <form onSubmit={handleSaveVehicle} className="space-y-4">
                    <div className="flex flex-col items-center gap-4 mb-6">
                      <div 
                        onClick={() => vehiclePhotoInputRef.current?.click()}
                        className="w-40 h-40 rounded-[2rem] bg-slate-100 border-4 border-white shadow-inner flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200 transition-all overflow-hidden relative group"
                      >
                        {vehicleFormData.photo ? (
                          <>
                            <img src={vehicleFormData.photo} alt="Veículo" className="w-full h-full object-contain p-2" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Camera className="text-white" size={24} />
                            </div>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="text-slate-300 mb-2" size={32} />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Foto do Veículo</span>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={vehiclePhotoInputRef} 
                        onChange={handleVehiclePhotoChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className={labelClasses}>Placa</label>
                        <input 
                          type="text" 
                          value={vehicleFormData.plate} 
                          onChange={e => setVehicleFormData({...vehicleFormData, plate: normalizePlate(e.target.value)})} 
                          className={inputClasses} 
                          placeholder="ABC-1D23" 
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className={labelClasses}>Código da Frota</label>
                        <input 
                          type="text" 
                          value={vehicleFormData.fleetCode} 
                          onChange={e => setVehicleFormData({...vehicleFormData, fleetCode: e.target.value.toUpperCase()})} 
                          className={inputClasses} 
                          placeholder="Ex: ABT 8354" 
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Marca</label>
                        <input 
                          type="text" 
                          value={vehicleFormData.brand} 
                          onChange={e => setVehicleFormData({...vehicleFormData, brand: e.target.value})} 
                          className={inputClasses} 
                          placeholder="Ex: Toyota" 
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Modelo</label>
                        <input 
                          type="text" 
                          value={vehicleFormData.model} 
                          onChange={e => setVehicleFormData({...vehicleFormData, model: e.target.value})} 
                          className={inputClasses} 
                          placeholder="Ex: Hilux" 
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Ano</label>
                        <input 
                          type="text" 
                          value={vehicleFormData.year} 
                          onChange={e => setVehicleFormData({...vehicleFormData, year: e.target.value})} 
                          className={inputClasses} 
                          placeholder="2024" 
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Cor</label>
                        <input 
                          type="text" 
                          value={vehicleFormData.color} 
                          onChange={e => setVehicleFormData({...vehicleFormData, color: e.target.value})} 
                          className={inputClasses} 
                          placeholder="Branco" 
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button 
                        type="button"
                        onClick={() => { setVehicleFormData(initialVehicleData); setEditingVehicleId(null); }}
                        className="flex-1 py-3 bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-200 transition-all"
                      >
                        Limpar
                      </button>
                      <button 
                        type="submit"
                        disabled={savingVehicle}
                        className="flex-[2] py-3 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        {savingVehicle ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {editingVehicleId ? 'Atualizar' : 'Cadastrar'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* List Section */}
                <div className="lg:col-span-7 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Veículos Cadastrados</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto no-scrollbar p-2">
                    {vehicles.length === 0 ? (
                      <div className="col-span-2 py-20 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <Car size={40} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-slate-400 font-bold italic text-xs">Nenhum veículo cadastrado.</p>
                      </div>
                    ) : (
                      vehicles.map(v => (
                        <div key={v.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex gap-3 group hover:border-blue-200 transition-all">
                          <div className="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                            {v.photo ? (
                              <img src={v.photo} alt={v.plate} className="w-full h-full object-contain p-1" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Car size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-tight">{formatPlate(v.plate)}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{v.fleetCode || 'Sem Código'}</span>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => { setVehicleFormData(v); setEditingVehicleId(v.id); }}
                                  className="p-1 text-slate-400 hover:text-blue-600"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteVehicleAction(v.id)}
                                  className="p-1 text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <p className="text-[11px] font-black text-slate-800 uppercase truncate">{v.brand} {v.model}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{v.year} • {v.color}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingAttachment && (
        <div className="fixed inset-0 bg-slate-950/95 z-[3000] flex flex-col backdrop-blur-xl animate-in fade-in duration-300">
          <div className="p-3 md:p-6 flex justify-between items-center bg-black/20 backdrop-blur-md border-b border-white/10">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-emerald-600 p-1.5 md:p-2 rounded-xl text-white">
                <FileText size={18} className="md:w-5 md:h-5" />
              </div>
              <h3 className="font-black text-white uppercase tracking-tight text-xs md:text-sm hidden sm:block">Nota Fiscal Digitalizada</h3>
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
                onClick={() => handleDownload(viewingAttachment)}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Baixar</span>
              </button>

              <button onClick={() => { setViewingAttachment(null); resetZoom(); }} className="p-2 md:p-2.5 bg-white/10 hover:bg-white/20 text-white transition-all rounded-full">
                <X size={18} className="md:w-5 md:h-5"/>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-900/50">
            <div 
              className="relative transition-transform duration-200 ease-out origin-center"
              style={{ transform: `scale(${zoomScale})` }}
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={viewingAttachment} 
                alt="Nota Fiscal" 
                className="max-w-full max-h-[85vh] shadow-2xl rounded-lg border border-white/10" 
              />
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-950/80 z-[4000] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Trash2 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Excluir Registro?</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium">Esta ação é irreversível e removerá permanentemente o registro de abastecimento do sistema.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                <button onClick={confirmDeleteSupply} className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95">Confirmar Exclusão</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteVehicleId && (
        <div className="fixed inset-0 bg-slate-950/80 z-[4000] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Car size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Remover Veículo?</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium">Deseja realmente remover este veículo da frota? Os registros de abastecimento vinculados a esta placa permanecerão no histórico.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setConfirmDeleteVehicleId(null)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                <button onClick={confirmDeleteVehicle} className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95">Confirmar Remoção</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelSupplyManager;
