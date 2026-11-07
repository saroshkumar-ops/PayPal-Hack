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
  AlertCircle,
  ShieldCheck,
  Sparkles
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
          setErrorMsg('Please enter both your email address and password.');
          setIsLoading(false);
          return;
        }
        const user = await authService.login({ email: email.trim(), password });
        onLoginSuccess(user);
      } else {
        if (!name.trim()) {
          setErrorMsg('Please enter your full name.');
          setIsLoading(false);
          return;
        }
        if (!email.trim() || !password) {
          setErrorMsg('Email and password are required.');
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
        setErrorMsg('Invalid email or password. Please verify credentials or register.');
      } else {
        setErrorMsg('Registration failed. The email address may already be registered.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080D] text-[#EDEEF2] flex flex-col items-center justify-center p-4 sm:p-6 font-body selection:bg-white/20 selection:text-white relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10 flex flex-col items-center"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2 mb-8">
          <Logo size="lg" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171A23] border border-white/8 text-[11px] font-mono text-[#C6FF3D] mt-2">
            <Sparkles className="w-3.5 h-3.5 text-[#C6FF3D]" />
            <span>CRYPTOGRAPHIC LEDGER ACCESS</span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="w-full rounded-3xl bg-[#0F1117] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-6 sm:p-8 space-y-6">
          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-[#07080D] rounded-xl border border-white/8">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(null); }}
              className={`py-2 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#171A23] text-[#C6FF3D] border border-white/10 shadow-sm'
                  : 'text-[#8A8FA3] hover:text-[#EDEEF2]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(null); }}
              className={`py-2 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#171A23] text-[#C6FF3D] border border-white/10 shadow-sm'
                  : 'text-[#8A8FA3] hover:text-[#EDEEF2]'
              }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FF5C7A]/10 border border-[#FF5C7A]/30 text-xs font-mono text-[#FF5C7A]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {mode === 'register' && (
              <>
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#8A8FA3] font-body flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#C6FF3D]" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDEEF2] font-body focus:outline-none focus:border-[#C6FF3D] transition-colors"
                    required
                  />
                </div>

                {/* Handle */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#8A8FA3] font-body flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-[#C6FF3D]" />
                    <span>Handle</span>
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D] transition-colors"
                  />
                </div>
              </>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#8A8FA3] font-body flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#C6FF3D]" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D] transition-colors"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#8A8FA3] font-body flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#C6FF3D]" />
                <span>Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D] transition-colors"
                required
              />
            </div>

            {mode === 'register' && (
              /* PayPal Settlement Email */
              <div className="space-y-1.5">
                <label className="text-xs text-[#8A8FA3] font-body flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#C6FF3D]" />
                  <span>PayPal Settlement Email</span>
                </label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D] transition-colors"
                />
              </div>
            )}

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
                  ? 'Authenticating...' 
                  : (mode === 'login' ? 'Sign In' : 'Create Account')}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] font-mono text-[#8A8FA3]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C6FF3D]" />
              <span>BCrypt Password Hashing & Signed JWT Access</span>
            </div>
          </form>
        </div>

        {/* Toggle Mode Quick Link */}
        <div className="mt-6 text-xs text-[#8A8FA3] font-mono text-center">
          {mode === 'login' ? (
            <span>
              New traveler?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(null); }}
                className="text-[#C6FF3D] hover:underline font-semibold cursor-pointer"
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
                className="text-[#C6FF3D] hover:underline font-semibold cursor-pointer"
              >
                Sign in to your account
              </button>
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
};
