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
    <div className="min-h-screen bg-mtabi-bg text-mtabi-text flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-mtabi-card border border-mtabi-border rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Detalhes Visuais Premium em Hover/Fundo */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-mtabi-yellow/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-mtabi-yellow/5 rounded-full blur-2xl pointer-events-none"></div>

        {/* LOGO MTABI */}
        <div className="flex flex-col items-center mb-8 select-none">
          <img 
            src="/mtabi-logo-transparente.svg" 
            alt="Logo MTABI" 
            className="h-16 object-contain"
          />
          <p className="text-[10px] text-mtabi-muted uppercase tracking-widest mt-4">
            Gestão Interna de Negócios
          </p>
        </div>

        {/* MENSAGENS DE NOTIFICAÇÃO */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-mtabi-error/10 border border-mtabi-error/30 rounded-xl flex items-start gap-3 text-mtabi-error text-sm">
            <AlertCircle className="shrink-0 mt-0.5" size={16} />
            <p>{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-mtabi-success/10 border border-mtabi-success/30 rounded-xl flex items-start gap-3 text-mtabi-success text-sm">
            <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
            <p>{successMsg}</p>
          </div>
        )}

        {/* FORMULÁRIO DE LOGIN */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-mtabi-muted mb-2">
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
                  className="w-full pl-11 pr-4 py-2.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors font-sans"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-mtabi-muted">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setView('recovery')}
                  className="text-xs text-mtabi-yellow hover:underline"
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
                  className="w-full pl-11 pr-11 py-2.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-mtabi-muted hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black font-bold font-display rounded-xl tracking-wide transition-all shadow-lg hover:shadow-mtabi-yellow/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                'ENTRAR NO SISTEMA'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                localStorage.setItem('mtabi_use_mock', 'true');
                window.location.reload();
              }}
              className="w-full py-2.5 bg-mtabi-card hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold font-display rounded-xl tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              AVALIAR SISTEMA (MODO DEMONSTRAÇÃO LOCAL)
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-mtabi-muted">
                Novo por aqui?{' '}
                <button
                  type="button"
                  onClick={() => setView('signup')}
                  className="text-mtabi-yellow hover:underline font-medium"
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-mtabi-muted mb-2">
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
                  className="w-full pl-11 pr-4 py-2.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-mtabi-muted mb-2">
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
                  className="w-full pl-11 pr-11 py-2.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-mtabi-muted hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black font-bold font-display rounded-xl tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                className="text-xs text-mtabi-yellow hover:underline"
              >
                Voltar para o Login
              </button>
            </div>
          </form>
        )}

        {/* FORMULÁRIO DE RECUPERAÇÃO */}
        {view === 'recovery' && (
          <form onSubmit={handleRecoverySubmit} className="space-y-5">
            <p className="text-xs text-mtabi-muted leading-relaxed">
              Insira seu e-mail cadastrado. Enviaremos um link seguro para redefinir sua senha.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-mtabi-muted mb-2">
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
                  className="w-full pl-11 pr-4 py-2.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black font-bold font-display rounded-xl tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                'ENVIAR E-MAIL DE RECUPERAÇÃO'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-xs text-mtabi-yellow hover:underline font-medium"
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
