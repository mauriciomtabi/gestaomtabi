import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabaseService';
import { Operator } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Clientes from './components/Clientes';
import Projetos from './components/Projetos';
import Pipeline from './components/Pipeline';
import Ferramentas from './components/Ferramentas';
import Financeiro from './components/Financeiro';

import { 
  LayoutDashboard, 
  Building2, 
  FolderKanban, 
  TrendingUp, 
  Wrench, 
  Landmark, 
  Menu, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  UserCircle, 
  X, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  Sun,
  Moon
} from 'lucide-react';

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-[2000] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-in slide-in-from-right-10 duration-300 font-sans ${
      type === 'success' 
        ? 'bg-emerald-950 border-emerald-800 text-emerald-300' 
        : 'bg-red-950 border-red-800 text-red-300'
    }`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <p className="text-xs font-bold uppercase tracking-wider">{message}</p>
      <button onClick={onClose} className="ml-3 opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
        <X size={14} />
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Operator | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStatus, setBootStatus] = useState("Iniciando...");
  const [view, setView] = useState<'dashboard' | 'clientes' | 'projetos' | 'pipeline' | 'ferramentas' | 'financeiro'>(() => {
    const saved = localStorage.getItem('mtabi_last_view');
    const valid = ['dashboard', 'clientes', 'projetos', 'pipeline', 'ferramentas', 'financeiro'];
    return (saved && valid.includes(saved) ? saved : 'dashboard') as any;
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('mtabi_theme');
    return (saved === 'light' ? 'light' : 'dark');
  });

  // Persiste a view ativa sempre que mudar
  useEffect(() => {
    localStorage.setItem('mtabi_last_view', view);
  }, [view]);

  // Efeito para sincronizar tema
  useEffect(() => {
    localStorage.setItem('mtabi_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);
  
  // Sincronizar navegação direta de sub-telas (ex: ir para projetos a partir de um cliente)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Layout Sidebar (Desktop)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Menu "Mais" (Mobile)
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Carregar sessão auth
  useEffect(() => {
    if (localStorage.getItem('mtabi_use_mock') === 'true') {
      const mockUser: Operator = {
        id: 'mock-user-id',
        name: 'Operador Convidado',
        email: 'demo@mtabi.com',
        allowedScreens: ['dashboard', 'clientes', 'projetos', 'pipeline', 'ferramentas', 'financeiro'],
        isAdmin: true
      };
      setCurrentUser(mockUser);
      setIsBooting(false);
      return;
    }

    // Escuta mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth Event] ${event}`);
      
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setView('dashboard');
        setIsBooting(false);
      } else if (session) {
        handleLoadSession(session);
      } else {
        setIsBooting(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLoadSession = async (session: any) => {
    try {
      setBootStatus("Conectando ao Supabase...");
      setBootProgress(30);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      setBootProgress(70);
      setBootStatus("Sincronizando ambiente...");

      const operator: Operator = {
        id: session.user.id,
        name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || "Founder",
        email: session.user.email || "",
        profilePhoto: profile?.profile_photo || undefined,
        allowedScreens: ['dashboard', 'clientes', 'projetos', 'pipeline', 'ferramentas', 'financeiro'],
        isAdmin: true
      };

      setCurrentUser(operator);
      setBootProgress(100);
      setBootStatus("Pronto.");
      
      setTimeout(() => {
        setIsBooting(false);
      }, 500);
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
      setIsBooting(false);
    }
  };

  const handleLogout = async () => {
    if (localStorage.getItem('mtabi_use_mock') === 'true') {
      localStorage.removeItem('mtabi_use_mock');
      window.location.reload();
      return;
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Erro ao deslogar:", e);
    }
  };

  // Navegar direto para o Projeto (vindo de Clientes)
  const navigateToProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setView('projetos');
  };

  if (isBooting) {
    return (
      <div className="min-h-screen bg-mtabi-bg text-mtabi-text flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-xs space-y-4 text-center">
          {/* Logo MTABI renderizado em HTML/CSS */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-mtabi-yellow rounded-xl flex items-center justify-center shadow-lg p-2.5 select-none">
              <div className="flex items-end gap-1 h-7">
                <div className="w-1.5 bg-black h-4"></div>
                <div className="w-1.5 bg-black h-6"></div>
                <div className="w-1.5 bg-white h-4"></div>
                <div className="w-1.5 bg-white h-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-black origin-top-left -rotate-12"></div>
                </div>
              </div>
            </div>
            <h1 className="text-xl font-extrabold tracking-wider font-display text-white mt-3">
              MT<span className="text-mtabi-yellow">ABI</span>
            </h1>
          </div>

          <div className="h-1.5 bg-mtabi-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-mtabi-yellow transition-all duration-300 rounded-full"
              style={{ width: `${bootProgress}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-mtabi-muted uppercase tracking-widest font-mono">
            {bootStatus}
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  // --- DEFINIÇÃO DOS MÓDULOS DO MENU ---
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Building2 },
    { id: 'projetos', label: 'Projetos', icon: FolderKanban },
    { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
    { id: 'financeiro', label: 'Financeiro', icon: Landmark },
    { id: 'ferramentas', label: 'Ferramentas & Custos', icon: Wrench }
  ] as const;

  return (
    <div className="min-h-screen bg-mtabi-bg text-mtabi-text flex flex-col md:flex-row">
      
      {/* 1. SIDEBAR (DESKTOP LAYOUT) */}
      <aside className={`hidden md:flex flex-col shrink-0 bg-mtabi-card border-r border-mtabi-border transition-all duration-300 sticky top-0 h-screen z-30 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-6 -right-3.5 z-50 p-1.5 bg-mtabi-card border border-mtabi-border text-mtabi-muted hover:text-mtabi-text rounded-full transition-colors cursor-pointer"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* LOGO */}
        <div className={`border-b border-mtabi-border flex items-center gap-3.5 transition-all select-none ${
          sidebarCollapsed ? 'justify-center p-4 py-6' : 'p-6'
        }`}>
          <img 
            src={theme === 'light' ? "/mtabi-icone-preto.svg" : "/mtabi-icone-amarelo-branco.svg"} 
            alt="Logo MTABI" 
            className={`object-contain shrink-0 select-none transition-all ${
              sidebarCollapsed ? 'w-10 h-10' : 'w-14 h-14'
            }`} 
          />
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h2 className="text-2xl font-black tracking-wider font-display text-mtabi-text select-none leading-none">
                MT<span className="text-mtabi-yellow">ABI</span>
              </h2>
              <span className="text-[9px] text-mtabi-muted uppercase tracking-widest block mt-1.5 font-bold">
                Gestão Interna
              </span>
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO SIDEBAR */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  if (item.id === 'projetos') setSelectedProjectId(null);
                }}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
                  active 
                    ? 'bg-mtabi-yellow text-black border-mtabi-yellow shadow-md shadow-mtabi-yellow/5' 
                    : 'text-mtabi-muted hover:text-mtabi-text border-transparent hover:bg-mtabi-border/30'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* PERFIL / LOGOUT BOTTOM */}
        <div className="p-4 border-t border-mtabi-border space-y-2">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-full flex items-center gap-3.5 px-3 py-2 text-xs font-bold text-mtabi-muted hover:text-mtabi-text hover:bg-mtabi-border/30 border border-transparent rounded-xl transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {!sidebarCollapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>

          <div className="flex items-center gap-3 px-2">
            <UserCircle className="text-mtabi-muted shrink-0" size={24} />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-mtabi-text truncate">{currentUser.name}</p>
                <p className="text-[9px] text-mtabi-muted truncate">{currentUser.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3.5 px-3 py-2 text-xs font-bold text-mtabi-error hover:bg-mtabi-error/10 border border-transparent hover:border-mtabi-error/20 rounded-xl transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Sair do Sistema"
          >
            <LogOut size={16} />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* 2. BODY CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto px-4 py-6 md:p-8 pb-24 md:pb-8">
        
        {/* Renderiza Componente com base na View Ativa */}
        {view === 'dashboard' && <Dashboard onNavigate={(v) => setView(v)} />}
        {view === 'clientes' && <Clientes onNavigateToProject={navigateToProject} />}
        {view === 'projetos' && (
          <Projetos 
            selectedProjectId={selectedProjectId} 
            onClearSelectedProject={() => setSelectedProjectId(null)} 
          />
        )}
        {view === 'pipeline' && <Pipeline />}
        {view === 'financeiro' && <Financeiro />}
        {view === 'ferramentas' && <Ferramentas />}

      </main>

      {/* 3. MOBILE FIXED NAVIGATION TAB BAR (BOTTOM BAR) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-mtabi-card border-t border-mtabi-border px-3 py-2 flex items-center justify-around">
        
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => {
            setView('dashboard');
            setIsMobileMoreOpen(false);
          }}
          className={`flex flex-col items-center gap-1 py-1.5 transition-colors cursor-pointer ${
            view === 'dashboard' && !isMobileMoreOpen ? 'text-mtabi-yellow' : 'text-mtabi-muted hover:text-mtabi-text'
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[8px] font-bold uppercase tracking-wider">Dashboard</span>
        </button>

        {/* Tab 2: Clientes */}
        <button
          onClick={() => {
            setView('clientes');
            setIsMobileMoreOpen(false);
          }}
          className={`flex flex-col items-center gap-1 py-1.5 transition-colors cursor-pointer ${
            view === 'clientes' && !isMobileMoreOpen ? 'text-mtabi-yellow' : 'text-mtabi-muted hover:text-mtabi-text'
          }`}
        >
          <Building2 size={20} />
          <span className="text-[8px] font-bold uppercase tracking-wider">Clientes</span>
        </button>

        {/* Tab 3: Projetos */}
        <button
          onClick={() => {
            setView('projetos');
            setSelectedProjectId(null);
            setIsMobileMoreOpen(false);
          }}
          className={`flex flex-col items-center gap-1 py-1.5 transition-colors cursor-pointer ${
            view === 'projetos' && !isMobileMoreOpen ? 'text-mtabi-yellow' : 'text-mtabi-muted hover:text-mtabi-text'
          }`}
        >
          <FolderKanban size={20} />
          <span className="text-[8px] font-bold uppercase tracking-wider">Projetos</span>
        </button>

        {/* Tab 4: Pipeline */}
        <button
          onClick={() => {
            setView('pipeline');
            setIsMobileMoreOpen(false);
          }}
          className={`flex flex-col items-center gap-1 py-1.5 transition-colors cursor-pointer ${
            view === 'pipeline' && !isMobileMoreOpen ? 'text-mtabi-yellow' : 'text-mtabi-muted hover:text-mtabi-text'
          }`}
        >
          <TrendingUp size={20} />
          <span className="text-[8px] font-bold uppercase tracking-wider">CRM</span>
        </button>

        {/* Tab 5: "Mais" */}
        <button
          onClick={() => setIsMobileMoreOpen(!isMobileMoreOpen)}
          className={`flex flex-col items-center gap-1 py-1.5 transition-colors cursor-pointer ${
            isMobileMoreOpen ? 'text-mtabi-yellow' : 'text-mtabi-muted hover:text-mtabi-text'
          }`}
        >
          <MoreHorizontal size={20} />
          <span className="text-[8px] font-bold uppercase tracking-wider">Mais</span>
        </button>

      </nav>

      {/* MOBILE ACTION SHEET (MENU MAIS) */}
      {isMobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-xs flex items-end">
          {/* Overlay click closer */}
          <div className="absolute inset-0" onClick={() => setIsMobileMoreOpen(false)}></div>
          
          <div className="w-full bg-mtabi-card border-t border-mtabi-border rounded-t-3xl p-5 space-y-4 z-50 animate-in slide-in-from-bottom duration-300 font-sans">
            
            <div className="flex justify-between items-center border-b border-mtabi-border pb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-mtabi-text">Navegação Adicional</h3>
              <button 
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1 hover:bg-mtabi-border text-mtabi-muted hover:text-mtabi-text rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              
              <button
                onClick={() => {
                  setView('financeiro');
                  setIsMobileMoreOpen(false);
                }}
                className={`p-4 rounded-2xl flex flex-col items-center gap-2 border text-center transition-colors cursor-pointer ${
                  view === 'financeiro' ? 'bg-mtabi-yellow/10 border-mtabi-yellow text-mtabi-yellow' : 'bg-mtabi-bg border-mtabi-border text-mtabi-text'
                }`}
              >
                <Landmark size={24} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Financeiro</span>
              </button>

              <button
                onClick={() => {
                  setView('ferramentas');
                  setIsMobileMoreOpen(false);
                }}
                className={`p-4 rounded-2xl flex flex-col items-center gap-2 border text-center transition-colors cursor-pointer ${
                  view === 'ferramentas' ? 'bg-mtabi-yellow/10 border-mtabi-yellow text-mtabi-yellow' : 'bg-mtabi-bg border-mtabi-border text-mtabi-text'
                }`}
              >
                <Wrench size={24} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Ferramentas</span>
              </button>

            </div>

            <div className="pt-4 border-t border-mtabi-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle className="text-mtabi-muted" size={20} />
                <div className="text-left">
                  <p className="text-xs font-bold text-mtabi-text">{currentUser.name}</p>
                  <p className="text-[9px] text-mtabi-muted">{currentUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 bg-mtabi-bg hover:bg-mtabi-border/30 border border-mtabi-border text-mtabi-muted hover:text-mtabi-text rounded-xl cursor-pointer"
                  title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <button
                  onClick={() => {
                    setIsMobileMoreOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-mtabi-error/10 hover:bg-mtabi-error/20 border border-mtabi-error/20 rounded-xl text-[10px] font-bold text-mtabi-error uppercase tracking-wider cursor-pointer"
                >
                  <LogOut size={12} /> Sair
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TOASTS GLOBAL */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

    </div>
  );
};

export default App;
