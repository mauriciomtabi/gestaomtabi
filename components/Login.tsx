import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface Props {
  onLogin?: () => void; // Mantido para compatibilidade, mas o listener de App.tsx é o responsável real
}

const Login: React.FC<Props> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Controle de Abas (Login / Cadastro simples / Recuperação)
  const [view, setView] = useState<'login' | 'signup' | 'recovery'>('login');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error('E-mail ou senha incorretos.');
        }
        throw error;
      }
    } catch (err: any) {
      console.error('Erro de login:', err);
      setErrorMsg(err.message || 'Falha ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: email.split('@')[0], // Nome provisório
            rank: 'Founder'
          }
        }
      });

      if (error) throw error;
      setSuccessMsg('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
      setView('login');
    } catch (err: any) {
      console.error('Erro de cadastro:', err);
      setErrorMsg(err.message || 'Falha ao realizar cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });

      if (error) throw error;
      setSuccessMsg('E-mail de recuperação enviado com sucesso!');
      setView('login');
    } catch (err: any) {
      console.error('Erro de recuperação:', err);
      setErrorMsg(err.message || 'Falha ao enviar e-mail de recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mtabi-bg text-mtabi-text flex items-center justify-center p-4 relative overflow-hidden tech-grid">
      
      {/* Background Animated Neon Orbs */}
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-mtabi-yellow/10 rounded-full blur-[100px] animate-float-1 pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] animate-float-2 pointer-events-none"></div>
      
      {/* Card Wrapper (Glassmorphism) */}
      <div className="w-full max-w-md backdrop-blur-md bg-[#1C1F26]/75 border border-[#2A2F3D]/80 rounded-3xl p-8 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.6)] hover:shadow-[0_0_40px_rgba(232,163,61,0.06)] hover:border-mtabi-yellow/20 transition-all duration-500 relative z-10 overflow-hidden">
        
        {/* Subtle interior glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-mtabi-yellow/5 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* LOGO MTABI FUTURISTIC SECTION */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="relative flex items-center justify-center mb-4">
            <div className="absolute w-48 h-48 bg-mtabi-yellow/10 rounded-full blur-2xl animate-glow-pulse"></div>
            
            <img 
              src="/mtabi-logo-transparente.svg" 
              alt="Logo MTABI" 
              className="h-48 object-contain relative z-10 hover:scale-105 transition-transform duration-300"
            />
          </div>
          <p className="text-[10px] text-mtabi-yellow font-bold uppercase tracking-[0.25em] font-display">
            Gestão Interna de Negócios
          </p>
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-mtabi-yellow/50 to-transparent mt-3"></div>
        </div>

        {/* MENSAGENS DE NOTIFICAÇÃO */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-mtabi-error/10 border border-mtabi-error/30 rounded-xl flex items-start gap-3 text-mtabi-error text-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="shrink-0 mt-0.5" size={16} />
            <p>{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-mtabi-success/10 border border-mtabi-success/30 rounded-xl flex items-start gap-3 text-mtabi-success text-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
            <p>{successMsg}</p>
          </div>
        )}

        {/* FORMULÁRIO DE LOGIN */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-mtabi-muted mb-2 font-display">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-mtabi-muted" size={18} />
                <input
                  type="email"
                  required
                  placeholder="seuemail@mtabi.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#13151A]/85 border border-[#2A2F3D]/80 rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow focus:ring-1 focus:ring-mtabi-yellow/30 focus:shadow-[0_0_15px_rgba(232,163,61,0.12)] transition-all font-sans text-white placeholder-mtabi-muted/50"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-mtabi-muted font-display">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setView('recovery')}
                  className="text-xs text-mtabi-yellow/80 hover:text-mtabi-yellow transition-colors hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-mtabi-muted" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-[#13151A]/85 border border-[#2A2F3D]/80 rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow focus:ring-1 focus:ring-mtabi-yellow/30 focus:shadow-[0_0_15px_rgba(232,163,61,0.12)] transition-all font-sans text-white placeholder-mtabi-muted/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-mtabi-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-mtabi-yellow to-[#D38B29] hover:shadow-[0_0_20px_rgba(232,163,61,0.35)] text-black font-black font-display rounded-xl tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                'ENTRAR NO SISTEMA'
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-mtabi-muted">
                Novo por aqui?{' '}
                <button
                  type="button"
                  onClick={() => setView('signup')}
                  className="text-mtabi-yellow hover:text-mtabi-yellow/80 hover:underline font-bold transition-colors"
                >
                  Criar conta
                </button>
              </span>
            </div>
          </form>
        )}

        {/* FORMULÁRIO DE CADASTRO */}
        {view === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-mtabi-muted mb-2 font-display">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-mtabi-muted" size={18} />
                <input
                  type="email"
                  required
                  placeholder="exemplo@mtabi.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#13151A]/85 border border-[#2A2F3D]/80 rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow focus:ring-1 focus:ring-mtabi-yellow/30 focus:shadow-[0_0_15px_rgba(232,163,61,0.12)] transition-all font-sans text-white placeholder-mtabi-muted/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-mtabi-muted mb-2 font-display">
                Senha (mínimo 6 caracteres)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-mtabi-muted" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-[#13151A]/85 border border-[#2A2F3D]/80 rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow focus:ring-1 focus:ring-mtabi-yellow/30 focus:shadow-[0_0_15px_rgba(232,163,61,0.12)] transition-all font-sans text-white placeholder-mtabi-muted/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-mtabi-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-mtabi-yellow to-[#D38B29] hover:shadow-[0_0_20px_rgba(232,163,61,0.35)] text-black font-black font-display rounded-xl tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                'CADASTRAR E ENTRAR'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-xs text-mtabi-yellow hover:underline font-bold transition-colors"
              >
                Voltar para o Login
              </button>
            </div>
          </form>
        )}

        {/* FORMULÁRIO DE RECUPERAÇÃO */}
        {view === 'recovery' && (
          <form onSubmit={handleRecoverySubmit} className="space-y-5">
            <p className="text-xs text-mtabi-muted leading-relaxed font-sans">
              Insira seu e-mail cadastrado. Enviaremos um link seguro para redefinir sua senha.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-mtabi-muted mb-2 font-display">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-mtabi-muted" size={18} />
                <input
                  type="email"
                  required
                  placeholder="seuemail@mtabi.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#13151A]/85 border border-[#2A2F3D]/80 rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow focus:ring-1 focus:ring-mtabi-yellow/30 focus:shadow-[0_0_15px_rgba(232,163,61,0.12)] transition-all font-sans text-white placeholder-mtabi-muted/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-mtabi-yellow to-[#D38B29] hover:shadow-[0_0_20px_rgba(232,163,61,0.35)] text-black font-black font-display rounded-xl tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                'ENVIAR LINK DE RECUPERAÇÃO'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-xs text-mtabi-yellow hover:underline font-bold transition-colors"
              >
                Voltar para o Login
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;
