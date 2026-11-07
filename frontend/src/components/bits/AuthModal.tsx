import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  AtSign, 
  CreditCard, 
  ArrowRight, 
  AlertCircle,
  ShieldCheck 
} from 'lucide-react';
import { authService } from '../../api/services';
import { Button } from '../ui/Button';
import type { AuthResponseDto } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthResponseDto) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setHandle('');
    setPaypalEmail('');
    setErrorMsg(null);
  };

  const handleSwitchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setErrorMsg('Please enter your email and password.');
          setIsLoading(false);
          return;
        }
        const user = await authService.login({ email: email.trim(), password });
        resetForm();
        onAuthSuccess(user);
        onClose();
      } else {
        if (!name.trim()) {
          setErrorMsg('Full name is required.');
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

        resetForm();
        onAuthSuccess(user);
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (serverMsg) {
        setErrorMsg(serverMsg);
      } else if (mode === 'login') {
        setErrorMsg('Invalid credentials or user not found. Please try again or create an account.');
      } else {
        setErrorMsg('Registration failed. The email may already be in use.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-3xl bg-[#0F1117] border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/8 bg-[#07080D]/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
                {mode === 'login' ? (
                  <LogIn className="w-4 h-4 text-[#C6FF3D]" />
                ) : (
                  <UserPlus className="w-4 h-4 text-[#C6FF3D]" />
                )}
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-[#EDEEF2] m-0">
                  {mode === 'login' ? 'Sign In to Account' : 'Create Ledger Profile'}
                </h3>
                <p className="text-[11px] text-[#8A8FA3] font-body m-0 mt-0.5">
                  Secure cryptographic JWT token authentication
                </p>
              </div>
            </div>

            <button
              onClick={() => { resetForm(); onClose(); }}
              className="p-1.5 rounded-lg text-[#8A8FA3] hover:text-[#EDEEF2] hover:bg-white/6 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 p-1.5 m-5 mb-0 bg-[#07080D] rounded-xl border border-white/8">
            <button
              type="button"
              onClick={() => handleSwitchMode('login')}
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
              onClick={() => handleSwitchMode('register')}
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
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
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
                    className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#EDEEF2] font-body focus:outline-none focus:border-[#C6FF3D] transition-colors"
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
                    className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D] transition-colors"
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
                className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D] transition-colors"
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
                className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D] transition-colors"
                required
              />
            </div>

            {mode === 'register' && (
              /* PayPal Sandbox Email */
              <div className="space-y-1.5">
                <label className="text-xs text-[#8A8FA3] font-body flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#C6FF3D]" />
                  <span>PayPal Settlement Email</span>
                </label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D] transition-colors"
                />
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isLoading}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full text-xs font-display font-semibold justify-center py-2.5"
              >
                {isLoading 
                  ? 'Authenticating...' 
                  : (mode === 'login' ? 'Sign In' : 'Create Account')}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] font-mono text-[#8A8FA3]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C6FF3D]" />
              <span>Passwords securely hashed via BCrypt</span>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
