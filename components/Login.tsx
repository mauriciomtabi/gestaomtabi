
import React, { useState, useEffect } from 'react';
import { Fingerprint, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, Sparkles, UserPlus, ArrowLeft, Mail, User, Award, Lock, ChevronDown, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import { validateCPF, maskCPF } from '../utils/validation';
import { Operator } from '../types';
import { supabase, requestPasswordReset, getSystemConfig } from '../services/supabaseService';

interface Props {
  onLogin: (user: Operator) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgotPassword'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [customRank, setCustomRank] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup States
  const [signupData, setSignupData] = useState({
    name: '',
    warName: '',
    cpf: '',
    email: '',
    rank: '',
    password: '',
    confirmPassword: ''
  });

  // Forgot Password States
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const [isValidCpf, setIsValidCpf] = useState(false);
  const [biometryAvailable, setBiometryAvailable] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      setBiometryAvailable(true);
    }
  }, []);

  const handleCpfChange = (value: string, isLogin: boolean) => {
    const masked = maskCPF(value);
    if (!isLogin) {
      setSignupData(prev => ({ ...prev, cpf: masked }));
      setIsValidCpf(validateCPF(masked));
    }
  };

  const handleRankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSignupData({ ...signupData, rank: val });
    setShowCustomRank(val === 'Outro');
    if (val !== 'Outro') setCustomRank('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    try {
      // Usa Promise.race para evitar o travamento (Deadlock de Auth Lock do Supabase) 
      // no primeiro acesso do dia quando requests concorrentes se chocam.
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        }),
        new Promise<{data: any, error: any}>((_, reject) => 
          setTimeout(() => reject(new Error("TIMEOUT_AUTH_LOCK")), 10000)
        )
      ]);

      if (error) throw error;

      // Buscar perfil na tabela profiles com timeout de segurança
      const { data: profile } = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle(),
        new Promise<{data: any}>((resolve) => 
          setTimeout(() => resolve({ data: null }), 6000)
        )
      ]);

      // Fallback: usa user_metadata se o perfil não existir ou houver timeout
      const meta = data.user.user_metadata;

      const userEmail = profile?.email || data.user.email || '';
      const isMaster = userEmail === 'mtabi.adm@gmail.com';

      const loggedInUser = {
        id: data.user.id,
        name: profile?.name || meta?.name || data.user.email?.split('@')[0] || 'Operador',
        warName: profile?.war_name || meta?.war_name || 'MILITAR',
        cpf: profile?.cpf || meta?.cpf || '000.000.000-00',
        email: userEmail,
        rank: profile?.rank || meta?.rank || 'Operador',
        profilePhoto: profile?.profile_photo,
        allowedScreens: isMaster ? ['dashboard', 'providers', 'face-checkin', 'fuel', 'reports', 'settings', 'swaps'] : (profile?.allowed_screens || ['dashboard', 'fuel', 'face-checkin', 'swaps']),
        isAdmin: isMaster ? true : (profile?.is_admin || false)
      };

      if (meta && (!profile?.war_name || !profile?.rank)) {
        supabase.from('profiles').update({
          war_name: loggedInUser.warName,
          rank: loggedInUser.rank,
          cpf: loggedInUser.cpf
        }).eq('id', data.user.id).then();
      }

      onLogin(loggedInUser);
    } catch (err: any) {
      let errorMsg = err.message;
      
      // Se detectarmos o deadlock de auth, forçamos o recarregamento. 
      // Como o token provavelmente já foi salvo no localStorage pelo GoTrueJS
      // antes do travamento da Promise, o reload fará o usuário entrar direto.
      if (errorMsg === 'TIMEOUT_AUTH_LOCK' || errorMsg.includes('lock')) {
        console.warn("Deadlock de autenticação detectado. Recarregando a aplicação...");
        window.location.reload();
        return;
      }

      if (errorMsg === 'Invalid login credentials') {
        errorMsg = 'E-mail ou senha incorretos.';
      } else if (errorMsg === 'Email not confirmed') {
        errorMsg = 'E-mail não confirmado. Por favor, verifique sua caixa de entrada e clique no link de confirmação.';
      } else if (errorMsg === 'Failed to fetch' || errorMsg.includes('Network')) {
        errorMsg = 'Erro de conexão. Verifique sua rede e tente novamente.';
      }
      setAuthError(errorMsg);
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const finalRank = signupData.rank === 'Outro' ? customRank : signupData.rank;
    const passwordsMatch = signupData.password === signupData.confirmPassword;
    
    if (!signupData.name || !signupData.warName || !signupData.email || !finalRank || signupData.password.length < 6 || !passwordsMatch) return;

    if (!signupData.email.endsWith('@cbm.rs.gov.br') && signupData.email !== 'mtabi.adm@gmail.com') {
      setAuthError("Acesso negado: O cadastro é restrito para e-mails institucionais (@cbm.rs.gov.br).");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await Promise.race([
        supabase.auth.signUp({
          email: signupData.email,
          password: signupData.password,
          options: {
            data: {
              name: signupData.name,
              war_name: signupData.warName.toUpperCase(),
              rank: finalRank
            }
          }
        }),
        new Promise<{data: any, error: any}>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout de conexão com o servidor de autenticação.")), 30000)
        )
      ]);

      if (error) throw error;

      if (data.user) {
        // Fetch default screens for new users
        let defaultScreens = ['dashboard', 'fuel', 'face-checkin', 'swaps'];
        try {
          const configScreens = await getSystemConfig('default_screens');
          if (configScreens && Array.isArray(configScreens)) {
            defaultScreens = configScreens;
          }
        } catch (e) {
          console.warn('Could not fetch default screens, using fallback', e);
        }

        // Create or update profile
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          name: signupData.name,
          war_name: signupData.warName.toUpperCase(),
          rank: finalRank,
          allowed_screens: defaultScreens
        }, { onConflict: 'id' });
        
        if (upsertError) {
          console.error("Warning: Profile upsert failed, relying on trigger/metadata fallback", upsertError);
        }
      }

      // Show success message and redirect to login instead of auto-login
      setSuccessMessage("Cadastro realizado com sucesso! Verifique sua caixa de entrada para confirmar o e-mail antes de acessar o sistema.");
      setMode('login');
      setLoginEmail(signupData.email);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail || !recoveryEmail.includes('@')) return;

    setRecoveryStatus('loading');
    try {
      await requestPasswordReset(recoveryEmail);
      setRecoveryStatus('success');
      setRecoveryMessage(`Um e-mail de recuperação foi enviado para ${recoveryEmail}. Verifique sua caixa de entrada.`);
    } catch (err: any) {
      setRecoveryStatus('error');
      setRecoveryMessage(err.message || 'Erro ao processar solicitação.');
    }
  };

  const ranks = [
    "Soldado", "Cabo", "3º Sargento", "2º Sargento", "1º Sargento", 
    "Subtenente", "2º Tenente", "1º Tenente", "Capitão", "Major", 
    "Tenente-Coronel", "Coronel", "Outro"
  ];

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="relative w-20 h-20 mb-4 group">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
            <img 
              src="https://i.postimg.cc/T1nny2hc/Brasao-cbmrs.png" 
              alt="Logo CBM" 
              className="w-full h-full object-contain relative z-10"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
            Gestão <span className="text-red-500">CBM</span>
          </h1>
          <p className="text-blue-400 text-[10px] font-black mt-1 uppercase tracking-[0.3em] flex items-center gap-2">
            Sapucaia do Sul
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl transition-all duration-500 overflow-hidden">
          
          {authError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 items-center animate-in shake duration-300">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-xs text-red-200 font-bold">{authError}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-3 items-center animate-in fade-in slide-in-from-top-4 duration-300">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
              <p className="text-xs text-emerald-200 font-bold">{successMessage}</p>
            </div>
          )}

          {mode === 'login' ? (
            <div className="animate-in slide-in-from-left-8 fade-in duration-500">
              <h2 className="text-white font-black text-lg mb-6 flex items-center gap-2">Acessar Sistema</h2>
              
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">E-mail Institucional</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      type="email" 
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="exemplo@cbm.rs.gov.br"
                      className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-2xl pl-12 pr-5 py-4 text-white outline-none transition-all placeholder:text-slate-600 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-2xl pl-12 pr-12 py-4 text-white outline-none transition-all placeholder:text-slate-600 font-bold text-sm"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading || !loginEmail.includes('@') || loginPassword.length < 4}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 text-xs uppercase tracking-widest"
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>Entrar no Sistema <ArrowRight size={18} /></>}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-6">
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setMode('forgotPassword')}
                    className="flex-1 text-[9px] font-black text-slate-500 uppercase py-2 hover:text-white"
                  >
                    Recuperar Senha
                  </button>
                  <button 
                    onClick={() => { setMode('signup'); setAuthError(null); setSuccessMessage(null); }}
                    className="flex-1 bg-blue-500/10 text-blue-400 border border-blue-500/10 py-3 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-500/20"
                  >
                    <UserPlus size={14} /> Criar Conta
                  </button>
                </div>
              </div>
            </div>
          ) : mode === 'signup' ? (
            <div className="animate-in slide-in-from-right-8 fade-in duration-500">
              <button 
                onClick={() => { setMode('login'); setAuthError(null); setSuccessMessage(null); }}
                className="text-slate-500 hover:text-white mb-6 flex items-center gap-2 text-[10px] font-black uppercase"
              >
                <ArrowLeft size={16} /> Voltar ao Login
              </button>
              
              <h2 className="text-white font-black text-lg mb-6">Cadastro de Operador</h2>

              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                      required
                      value={signupData.name}
                      onChange={(e) => setSignupData({...signupData, name: e.target.value})}
                      placeholder="NOME DO MILITAR"
                      className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl pl-12 pr-5 py-3 text-white outline-none transition-all placeholder:text-slate-700 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">POSTO/GRADUAÇÃO</label>
                  <div className="relative">
                    <select 
                      required
                      value={signupData.rank}
                      onChange={handleRankChange}
                      className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none transition-all font-bold text-xs appearance-none pr-10"
                    >
                      <option value="" disabled className="bg-slate-900">SELECIONE</option>
                      {ranks.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {showCustomRank && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Especifique o Posto/Graduação</label>
                    <input 
                      required
                      value={customRank}
                      onChange={(e) => setCustomRank(e.target.value)}
                      placeholder="DIGITE O POSTO"
                      className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none transition-all font-bold text-xs uppercase"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between items-end ml-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Nome de Guerra</label>
                    {signupData.rank && signupData.warName && (
                      <span className="text-[9px] font-black text-blue-400 tracking-wider">
                        PREVISÃO: {(signupData.rank === 'Outro' ? customRank : signupData.rank).toUpperCase()} {signupData.warName.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                      required
                      value={signupData.warName}
                      onChange={(e) => setSignupData({...signupData, warName: e.target.value})}
                      placeholder="NOME DE FARDA"
                      className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl pl-12 pr-5 py-3 text-white outline-none transition-all placeholder:text-slate-700 font-bold text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">E-mail Institucional</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                      required
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                      placeholder="exemplo@cbm.rs.gov.br"
                      className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl pl-12 pr-5 py-3 text-white outline-none transition-all placeholder:text-slate-700 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Senha</label>
                    <div className="relative">
                      <input 
                        required
                        type={showSignupPassword ? "text" : "password"}
                        value={signupData.password}
                        onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none transition-all font-bold text-xs"
                      />
                      <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                        {showSignupPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Confirmar</label>
                    <div className="relative">
                      <input 
                        required
                        type={showSignupConfirmPassword ? "text" : "password"}
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                        className={`w-full bg-white/5 border ${signupData.confirmPassword.length > 0 && signupData.password !== signupData.confirmPassword ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white outline-none font-bold text-xs`}
                      />
                      <button type="button" onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                        {showSignupConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading || signupData.password.length < 6 || signupData.password !== signupData.confirmPassword}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-900/20 text-xs uppercase tracking-widest"
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : "Solicitar Cadastro"}
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-8 fade-in duration-500">
              <button 
                onClick={() => { setMode('login'); setAuthError(null); setSuccessMessage(null); }}
                className="text-slate-500 hover:text-white mb-6 flex items-center gap-2 text-[10px] font-black uppercase"
              >
                <ArrowLeft size={16} /> Voltar ao Login
              </button>
              
              <h2 className="text-white font-black text-lg mb-4">Recuperar Senha</h2>
              <p className="text-slate-400 text-xs font-medium mb-6 leading-relaxed">Instruções serão enviadas para seu e-mail institucional.</p>

              {recoveryStatus === 'success' ? (
                <div className="text-center py-6 space-y-4">
                  <CheckCircle2 className="mx-auto text-emerald-500" size={32} />
                  <p className="text-sm font-bold text-white">{recoveryMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit} className="space-y-6">
                  <input 
                    type="email" 
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="E-MAIL INSTITUCIONAL"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold text-sm outline-none"
                  />
                  <button type="submit" disabled={recoveryStatus === 'loading'} className="w-full bg-blue-600 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest">
                    {recoveryStatus === 'loading' ? <Loader2 size={20} className="animate-spin" /> : "Solicitar"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
