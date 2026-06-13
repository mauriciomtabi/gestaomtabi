
import React, { useState, useEffect, useRef } from 'react';
import { Provider, AttendanceRecord, AuditLog, Operator, FuelSupply, Vehicle, StationNickname } from './types';
import ProviderList from './components/ProviderList';
import ProviderDetails from './components/ProviderDetails';
import Dashboard from './components/Dashboard';
import ReportOfficial from './components/ReportOfficial';
import ProviderModal from './components/ProviderModal';
import UserProfile from './components/UserProfile';
import Login from './components/Login';
import InstallGuide from './components/InstallGuide';
import FuelSupplyManager from './components/FuelSupplyManager';
import FaceCheckIn from './components/FaceCheckIn';
import Settings from './components/Settings';
import HelpCenter from './components/HelpCenter';
import ServiceSwapManager from './components/ServiceSwapManager';
import { Users, LayoutDashboard, FileText, Loader2, ShieldCheck, ShieldAlert, Cpu, Database, Network, Sparkles, LogOut, UserCircle, CheckCircle2, X, Smartphone, Fuel, ScanFace, Settings as SettingsIcon, HelpCircle, RefreshCw } from 'lucide-react';
import { getProviders, getAttendance, createProvider, updateProvider, saveAttendance, deleteAttendance, saveAuditLog, supabase, getFuelSupplies, getVehicles, getStationNicknames } from './services/supabaseService';

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-[2000] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-10 duration-500 ${type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'}`}>
      {type === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
      <p className="text-sm font-black uppercase tracking-tight">{message}</p>
      <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
        <X size={16} />
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'providers' | 'details' | 'reports' | 'settings' | 'fuel' | 'face-checkin' | 'help' | 'swaps'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'geral' | 'prestadores' | 'abastecimento'>('geral');
  
  const navigateToDashboard = (tab: 'geral' | 'prestadores' | 'abastecimento') => {
    setDashboardTab(tab);
    setView('dashboard');
  };

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Operator | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Scroll para o topo sempre que a view mudar
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [view]);
  
  const [isBooting, setIsBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStatus, setBootStatus] = useState("Iniciando Kernel...");
  
  const [providers, setProviders] = useState<Provider[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [fuelSupplies, setFuelSupplies] = useState<FuelSupply[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stationNicknames, setStationNicknames] = useState<StationNickname[]>([]);

  const bootMessages = [
    "Autenticando credenciais militares...",
    "Sincronizando Banco de Dados Supabase...",
    "Calibrando Engine de IA Gemini 3.0...",
    "Verificando integridade dos protocolos...",
    "Carregando registros de presença...",
    "Ajustando interface tática...",
    "Sistema Pronto."
  ];

  useEffect(() => {
    // 1. Verificação de primeiro acesso do dia (movida para o início)
    const today = new Date().toLocaleDateString('pt-BR');
    const lastAccess = localStorage.getItem('lastAccessDate');
    
    // 2. Inicialização do Auth Listener
    // O onAuthStateChange dispara imediatamente com a sessão atual (INITIAL_SESSION)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Evento detectado: ${event}`);
      
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setProviders([]);
        setAttendance([]);
        setFuelSupplies([]);
        setVehicles([]);
        setView('dashboard');
        setIsBooting(false);
      } else if (session) {
        // Se temos uma sessão, verificamos se precisamos forçar um reload diário
        // Fazemos isso APENAS se já estivermos autenticados para evitar loops no Login
        if (lastAccess && lastAccess !== today) {
          console.log("[App] Primeiro acesso do dia detectado. Atualizando sistema...");
          localStorage.setItem('lastAccessDate', today);
          // Pequeno delay para garantir que o storage foi gravado
          setTimeout(() => window.location.reload(), 100);
          return;
        }
        
        // Se não for reload, atualiza o storage silenciosamente se for nulo
        if (!lastAccess) localStorage.setItem('lastAccessDate', today);

        // Carrega o perfil e os dados
        handleAuthSession(session);
      } else {
        // Sem sessão e sem evento de sign out (pode ser o boot inicial sem login)
        setIsBooting(false);
      }
    });

    // Safety fallback: force boot to finish after 15 seconds if it hangs
    const fallbackTimer = setTimeout(() => {
      setIsBooting(false);
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) fetchData();
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleAuthSession = async (session: any) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      setBootProgress(progress);
      const msgIdx = Math.floor((progress / 100) * bootMessages.length);
      setBootStatus(bootMessages[Math.min(msgIdx, bootMessages.length - 1)]);
    }, 150);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      const meta = session.user.user_metadata;
      
      const operator: Operator = {
        id: session.user.id,
        name: profile?.name || meta?.name || "Operador",
        warName: profile?.war_name || meta?.war_name || "MILITAR",
        cpf: profile?.cpf || meta?.cpf || "000.000.000-00",
        email: profile?.email || session.user.email || "",
        rank: profile?.rank || meta?.rank || "Soldado",
        profilePhoto: profile?.profile_photo,
        allowedScreens: profile?.allowed_screens || ['dashboard', 'fuel', 'face-checkin', 'swaps'],
        isAdmin: profile?.is_admin || false
      };

      if (meta && (!profile?.war_name || !profile?.rank)) {
        supabase.from('profiles').update({
          war_name: operator.warName,
          rank: operator.rank,
          cpf: operator.cpf
        }).eq('id', session.user.id).then();
      }

      if (operator.email === 'mtabi.adm@gmail.com') {
        operator.isAdmin = true;
        operator.allowedScreens = ['dashboard', 'providers', 'face-checkin', 'fuel', 'reports', 'settings', 'swaps'];
      }

      setCurrentUser(operator);
      
      // Se a tela padrão 'dashboard' não for permitida para este operador, redireciona para a primeira tela permitida
      if (operator.allowedScreens && operator.allowedScreens.length > 0) {
        if (!operator.allowedScreens.includes('dashboard')) {
          const firstAllowed = operator.allowedScreens[0] as any;
          setView(firstAllowed);
        }
      }

      await fetchData();
      
      clearInterval(interval);
      setBootProgress(100);
      setBootStatus("Sistema Pronto.");
      setTimeout(() => setIsBooting(false), 500);
    } catch (err) {
      console.error("Erro ao processar sessão:", err);
      clearInterval(interval);
      setIsBooting(false);
    }
  };

  // Mantemos o checkUserAndFetch apenas como compatibilidade ou removemos se não for mais usado
  // Neste caso, handleAuthSession substituiu a lógica principal.

  const fetchData = async (retryCount = 0) => {
    try {
      setConnectionError(false);
      const [pData, aData, fData, vData, nData] = await Promise.all([
        getProviders(), 
        getAttendance(), 
        getFuelSupplies(),
        getVehicles(),
        getStationNicknames()
      ]);
      setProviders(pData);
      setAttendance(aData);
      setFuelSupplies(fData);
      setVehicles(vData);
      setStationNicknames(nData);
    } catch (err) {
      console.error(`Erro ao atualizar dados (tentativa ${retryCount}):`, err);
      if (retryCount < 3) {
        // Tenta novamente após 2 segundos, possivelmente esperando o token renovar
        setTimeout(() => fetchData(retryCount + 1), 2000);
      } else {
        setConnectionError(true);
      }
    }
  };

  const handleLogin = async (user: Operator) => {
    setCurrentUser(user);
    await fetchData();
  };

  const handleUpdateProfile = async (updatedUser: Operator) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let photoUrl = updatedUser.profilePhoto || null;
      const oldPhotoUrl = currentUser?.profilePhoto || null;

      // If photo is a base64 data URL, upload it to Supabase Storage
      if (photoUrl && photoUrl.startsWith('data:')) {
        const { uploadProfilePhoto, deleteDocument } = await import('./services/supabaseService');
        photoUrl = await uploadProfilePhoto(session.user.id, photoUrl);
        if (oldPhotoUrl && oldPhotoUrl !== photoUrl) {
          await deleteDocument(oldPhotoUrl);
        }
      } else if (!photoUrl && oldPhotoUrl) {
        const { deleteDocument } = await import('./services/supabaseService');
        await deleteDocument(oldPhotoUrl);
      }

      const { error } = await supabase.from('profiles').update({
        name: updatedUser.name,
        war_name: updatedUser.warName,
        rank: updatedUser.rank,
        profile_photo: photoUrl
      }).eq('id', session.user.id);
      if (error) throw error;
      setCurrentUser({ ...updatedUser, profilePhoto: photoUrl || undefined });
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout ao sair.")), 3000))
      ]);
    } catch (e) {
      console.error("Erro ao fazer logout:", e);
    }
    setCurrentUser(null);
    setProviders([]);
    setAttendance([]);
    setFuelSupplies([]);
    setVehicles([]);
    setView('dashboard');
  };

  const handleSelectProvider = (id: string) => {
    setSelectedProviderId(id);
    setView('details');
  };

  const handleAddProvider = async (newProviderData: any) => {
    try {
      if (newProviderData.processNumber && providers.some(p => p.processNumber === newProviderData.processNumber)) {
        throw new Error("Já existe um prestador cadastrado com este Número de Processo.");
      }

      const initialLog: AuditLog = {
        id: 'temp-init', 
        timestamp: new Date().toISOString(),
        userName: currentUser?.warName || "Operador",
        action: 'CADASTRO',
        details: `Novo cadastro criado para ${newProviderData.name}`
      };
      
      const saved = await createProvider({ ...newProviderData, history: [initialLog] });
      await fetchData();
      setEditingProvider(null);
      setIsModalOpen(false);
      setNotification({ message: "Cadastro realizado com sucesso!", type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Erro ao salvar: ${err.message}`, type: 'error' });
      throw err;
    }
  };

  const handleEditProvider = async (updatedData: any) => {
    if (!editingProvider) return;
    try {
      const changes: string[] = [];
      const fieldsToTrack: {key: keyof Provider, label: string}[] = [
        { key: 'name', label: 'Nome' },
        { key: 'processNumber', label: 'Processo' },
        { key: 'phone', label: 'Telefone' },
        { key: 'address', label: 'Endereço' },
        { key: 'assignedEntity', label: 'Entidade' },
        { key: 'totalHoursToFulfill', label: 'Horas Totais' },
        { key: 'observations', label: 'Observações' },
        { key: 'referralDate', label: 'Data Encaminhamento' },
        { key: 'receiptDate', label: 'Data Recebimento' }
      ];

      fieldsToTrack.forEach(field => {
        if (updatedData[field.key] !== editingProvider[field.key]) {
          changes.push(`${field.label}: de "${editingProvider[field.key] || 'vazio'}" para "${updatedData[field.key] || 'vazio'}"`);
        }
      });

      const details = changes.length > 0 
        ? `Modificações realizadas:\n${changes.join('\n')}` 
        : `Dados cadastrais atualizados (nenhuma mudança detectada em campos rastreados).`;

      await updateProvider(editingProvider.id, updatedData);
      const log: AuditLog = {
        id: 'temp-edit',
        timestamp: new Date().toISOString(),
        userName: currentUser?.warName || "Operador",
        action: 'EDIÇÃO',
        details
      };
      await saveAuditLog(editingProvider.id, log);
      await fetchData();
      setEditingProvider(null);
      setIsModalOpen(false);
      setNotification({ message: "Cadastro atualizado com sucesso!", type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Erro ao editar: ${err.message}`, type: 'error' });
      throw err;
    }
  };

  const handleUpdateProviderAttendance = async (providerId: string, updatedRecords: AttendanceRecord[]) => {
    try {
      await saveAttendance(updatedRecords);
      await fetchData();
      setNotification({ message: "Frequência atualizada com sucesso!", type: 'success' });
    } catch (err: any) {
      setNotification({ message: "Erro ao salvar frequência.", type: 'error' });
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    try {
      await deleteAttendance(id);
      await fetchData();
      setNotification({ message: "Registro excluído com sucesso!", type: 'success' });
    } catch (err) {
      setNotification({ message: "Erro ao excluir registro.", type: 'error' });
    }
  };

  const handleUpdateProvider = async (updatedProvider: Provider) => {
    try {
      const { history, ...rest } = updatedProvider;
      await updateProvider(updatedProvider.id, rest);
      if (history && history.length > 0 && history[0].id.startsWith('temp-')) {
        await saveAuditLog(updatedProvider.id, history[0]);
      }
      await fetchData();
      setNotification({ message: "Dados do prestador atualizados!", type: 'success' });
    } catch (err) {
      console.error("Erro no update do prestador:", err);
      setNotification({ message: "Erro ao atualizar prestador.", type: 'error' });
    }
  };

  if (isBooting) {
    return (
      <div className="fixed inset-0 bg-[#020617] z-[1000] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-12 group">
            <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl scale-150 animate-pulse"></div>
            <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
              <img src="https://i.postimg.cc/T1nny2hc/Brasao-cbmrs.png" alt="Logo CBM" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">Gestão CBM <span className="text-red-500">RS</span></h1>
            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${bootProgress}%` }}></div>
              </div>
              <p className="text-[10px] font-black text-blue-400/80 uppercase tracking-[0.3em] animate-pulse">{bootStatus}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }


  const currentProvider = providers.find(p => p.id === selectedProviderId);
  const isReadOnly = currentUser?.email === 'cobom.consulta@cbm.rs.gov.br';
  
  const formattedMilitaryName = currentUser 
    ? ((currentUser.rank && currentUser.rank !== 'Outro' && currentUser.warName?.toUpperCase() !== 'COBOM' ? `${currentUser.rank} ` : '') + (currentUser.warName || ''))
    : 'Operador';

  const NavItem = ({ icon: Icon, label, target, active, onClick }: any) => (
    <button 
      onClick={onClick || (() => setView(target))}
      title={label}
      className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-2 py-2 md:px-4 md:py-2.5 rounded-xl transition-all flex-1 md:w-full shrink-0 text-[10px] md:text-sm font-bold ${active ? 'bg-blue-600 md:bg-blue-800 text-white shadow-lg md:shadow-inner scale-105 md:scale-100' : 'text-blue-200 hover:text-white hover:bg-blue-800/50'}`}
    >
      <Icon size={20} className="md:w-[18px] md:h-[18px]" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="h-screen print:h-auto overflow-hidden print:overflow-visible bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 animate-in fade-in zoom-in-95 duration-700">
      <nav className="bg-blue-950 text-white w-full md:w-64 p-2 md:p-4 fixed bottom-0 md:relative z-[100] md:h-full flex md:flex-col items-center md:items-start justify-around md:justify-start gap-1 md:gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] md:shadow-xl shrink-0 overflow-x-auto md:overflow-y-auto no-scrollbar print:hidden">
        <div className="hidden md:flex flex-col mb-8 w-full px-2 gap-4">
          <div className="flex items-center gap-4">
            <img src="https://i.postimg.cc/T1nny2hc/Brasao-cbmrs.png" alt="Logo Gestão CBM" className="w-14 h-14 object-contain" />
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase leading-tight text-white">Gestão CBM <span className="text-red-400">RS</span></h1>
            </div>
          </div>
        </div>
        
        <div className="flex md:flex-col gap-1 md:gap-2 w-full md:max-w-none">
          {currentUser.allowedScreens?.includes('dashboard') && (
            <NavItem icon={LayoutDashboard} label="Painel" target="dashboard" active={view === 'dashboard'} onClick={() => navigateToDashboard('geral')} />
          )}
          {currentUser.allowedScreens?.includes('providers') && (
            <NavItem icon={Users} label="Prestadores" target="providers" active={view === 'providers' || view === 'details'} />
          )}
          {currentUser.allowedScreens?.includes('face-checkin') && (
            <NavItem icon={ScanFace} label="Check-in Facial" target="face-checkin" active={view === 'face-checkin'} />
          )}
          {currentUser.allowedScreens?.includes('fuel') && (
            <NavItem icon={Fuel} label="Abastecimento" target="fuel" active={view === 'fuel'} />
          )}
          {currentUser.allowedScreens?.includes('swaps') && (
            <NavItem icon={RefreshCw} label="Troca de Serviço" target="swaps" active={view === 'swaps'} />
          )}
          {currentUser.allowedScreens?.includes('settings') && (
            <NavItem icon={SettingsIcon} label="Configurações" target="settings" active={view === 'settings'} />
          )}
          <NavItem icon={HelpCircle} label="Ajuda e Documentação" target="help" active={view === 'help'} />
        </div>

        <div className="hidden md:flex flex-col mt-auto w-full px-2 space-y-2 py-4">
          <button 
            onClick={() => setView('settings')}
            className={`px-3 py-3 bg-blue-900/30 rounded-2xl border border-white/5 text-left transition-all hover:bg-blue-800/50 ${view === 'settings' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
          >
            <p className="text-[8px] font-black uppercase text-blue-400 tracking-widest mb-1">Operador Logado</p>
            <p className="text-[11px] font-bold truncate text-white uppercase">{(currentUser.rank && currentUser.rank !== 'Outro' && currentUser.warName?.toUpperCase() !== 'COBOM' ? `${currentUser.rank} ` : '')}{(currentUser.warName || '')}</p>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-blue-300 hover:text-white hover:bg-red-500/20 transition-all w-full text-sm font-bold"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </nav>

      <main ref={mainRef} className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto print:p-0 print:overflow-visible">
        {connectionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-xl text-red-600">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-red-900 uppercase">Erro de Conexão com o Banco de Dados</p>
                <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight">O sistema não conseguiu sincronizar os dados. Verifique se o projeto Supabase está ativo.</p>
              </div>
            </div>
            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-red-700 transition-all active:scale-95"
            >
              Tentar Novamente
            </button>
          </div>
        )}
        {view === 'dashboard' && (
          <Dashboard 
            providers={providers} 
            attendance={attendance} 
            fuelSupplies={fuelSupplies} 
            vehicles={vehicles} 
            stationNicknames={stationNicknames}
            initialTab={dashboardTab}
            onNavigateProvider={(p) => {
              setSelectedProviderId(p.id);
              setView('details');
            }}
            onNavigateFuel={() => setView('fuel')}
          />
        )}
        {view === 'providers' && (
          <ProviderList 
            providers={providers} 
            attendance={attendance}
            onSelect={handleSelectProvider}
            onAdd={isReadOnly ? undefined : () => setIsModalOpen(true)}
            onNavigateDashboard={() => navigateToDashboard('prestadores')}
          />
        )}
        {view === 'details' && currentProvider && (
          <ProviderDetails 
            provider={currentProvider} 
            attendance={attendance.filter(a => a.providerId === currentProvider.id)}
            onBack={() => setView('providers')}
            onUpdateAttendance={(recs) => handleUpdateProviderAttendance(currentProvider.id, recs)}
            onDeleteAttendance={handleDeleteAttendance}
            onUpdateProvider={handleUpdateProvider}
            onEditProvider={(p) => { setEditingProvider(p); setIsModalOpen(true); }}
            currentUser={formattedMilitaryName}
            setNotification={(msg: string, type: 'success' | 'error') => setNotification({ message: msg, type })}
            isReadOnly={isReadOnly}
          />
        )}
        {view === 'reports' && (
          <ReportOfficial 
            providers={providers} 
            attendance={attendance} 
            currentUser={formattedMilitaryName}
          />
        )}
        {view === 'fuel' && (
          <FuelSupplyManager 
            currentUser={formattedMilitaryName}
            vehicles={vehicles}
            fuelSupplies={fuelSupplies}
            stationNicknames={stationNicknames}
            onUpdateVehicles={fetchData}
            onNavigateDashboard={() => navigateToDashboard('abastecimento')}
            setNotification={(msg: string, type: 'success' | 'error') => setNotification({ message: msg, type })}
            isReadOnly={isReadOnly}
          />
        )}
        {view === 'face-checkin' && (
          <FaceCheckIn
            providers={providers}
            attendance={attendance}
            currentUser={formattedMilitaryName}
            onAttendanceUpdated={fetchData}
            setNotification={(msg: string, type: 'success' | 'error') => setNotification({ message: msg, type })}
          />
        )}
        {view === 'settings' && currentUser && (
          <Settings 
            currentUser={currentUser} 
            onUpdateProfile={handleUpdateProfile} 
            onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
            setNotification={(msg: string, type: 'success' | 'error') => setNotification({ message: msg, type })}
          />
        )}
        {view === 'swaps' && currentUser && (
          <ServiceSwapManager 
            currentUser={currentUser}
            setNotification={(msg: string, type: 'success' | 'error') => setNotification({ message: msg, type })}
            isReadOnly={isReadOnly}
          />
        )}
        {view === 'help' && (
          <HelpCenter currentUser={currentUser} />
        )}
      </main>

      {isModalOpen && (
        <ProviderModal 
          provider={editingProvider || undefined}
          onClose={() => { setIsModalOpen(false); setEditingProvider(null); }} 
          onSubmit={editingProvider ? handleEditProvider : handleAddProvider} 
        />
      )}

      {notification && (
        <Toast 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      {isInstallGuideOpen && (
        <InstallGuide onClose={() => setIsInstallGuideOpen(false)} />
      )}
    </div>
  );
};

export default App;
