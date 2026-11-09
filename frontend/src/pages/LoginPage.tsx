import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  AtSign, 
  CreditCard, 
  AlertCircle 
} from 'lucide-react';
import { authService } from '../api/services';
import { Logo } from '../components/common/Logo';
import { Button } from '../components/ui/Button';
import type { AuthResponseDto } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: AuthResponseDto) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setErrorMsg('Enter your email and password.');
          setIsLoading(false);
          return;
        }
        const user = await authService.login({ email: email.trim(), password });
        onLoginSuccess(user);
      } else {
        if (!name.trim()) {
          setErrorMsg('Enter your name.');
          setIsLoading(false);
          return;
        }
        if (!email.trim() || !password) {
          setErrorMsg('Enter email and password.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setIsLoading(false);
          return;
        }

        const cleanHandle = handle.trim() 
          ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`)
          : `@${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

        const cleanPaypal = paypalEmail.trim() || email.trim();

        const user = await authService.register({
          name: name.trim(),
          handle: cleanHandle,
          email: email.trim(),
          password,
          paypal_email: cleanPaypal,
        });

        onLoginSuccess(user);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (serverMsg) {
        setErrorMsg(serverMsg);
      } else if (mode === 'login') {
        setErrorMsg('Invalid email or password.');
      } else {
        setErrorMsg('Registration failed. Try another email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)] flex flex-col items-center justify-center p-4 sm:p-6 font-body relative overflow-hidden select-none">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md z-10 flex flex-col items-center space-y-6"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo size="lg" />
          <p className="text-xs text-[var(--muted)] font-mono tracking-tight m-0">
            Trip expense ledger & direct PayPal settlement
          </p>
        </div>

        {/* Auth Card with hairline border */}
        <div className="w-full rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 sm:p-8 space-y-5">
          {/* Tab Selector: strictly no lime text */}
          <div className="grid grid-cols-2 p-1 bg-[var(--canvas)] rounded-xl border border-[var(--border)]">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(null); }}
              className={`py-2 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-[var(--surface-elevated)] text-[var(--text)] border border-white/20 shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(null); }}
              className={`py-2 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-[var(--surface-elevated)] text-[var(--text)] border border-white/20 shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--owes)]/10 border border-[var(--owes)]/30 text-xs font-mono text-[var(--owes)]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {mode === 'register' && (
              <>
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--muted)] font-body flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[var(--muted)]" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Chen"
                    className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text)] font-body focus:outline-none focus:border-white/30 transition-colors"
                    required
                  />
                </div>

                {/* Handle */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--muted)] font-body flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-[var(--muted)]" />
                    <span>Trip Handle (optional)</span>
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@alex"
                    className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text)] font-mono focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
              </>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)] font-body flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="traveler@example.com"
                className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text)] font-mono focus:outline-none focus:border-white/30 transition-colors"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)] font-body flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text)] font-mono focus:outline-none focus:border-white/30 transition-colors"
                required
              />
            </div>

            {mode === 'register' && (
              /* PayPal Email */
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--muted)] font-body flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>PayPal Receiver Email (optional)</span>
                </label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="alex.paypal@example.com"
                  className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text)] font-mono focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
            )}

            {/* The single primary lime action on screen */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isLoading}
                icon={mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                className="w-full text-xs font-display font-semibold justify-center py-3"
              >
                {isLoading 
                  ? 'Verifying...' 
                  : (mode === 'login' ? 'Sign In' : 'Create Account')}
              </Button>
            </div>
          </form>
        </div>

        {/* Toggle Mode Quick Link: subtle text link */}
        <div className="text-xs text-[var(--muted)] font-mono text-center">
          {mode === 'login' ? (
            <span>
              New traveler?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(null); }}
                className="text-[var(--text)] hover:underline font-semibold cursor-pointer ml-1"
              >
                Create an account
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(null); }}
                className="text-[var(--text)] hover:underline font-semibold cursor-pointer ml-1"
              >
                Sign In
              </button>
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
};
