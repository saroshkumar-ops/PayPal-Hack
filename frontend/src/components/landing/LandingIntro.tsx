import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Receipt, 
  Layers, 
  CreditCard, 
  CheckCircle, 
  Sparkles,
  ShieldCheck,
  Zap,
  LogIn 
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { Button } from '../ui/Button';
import type { AuthResponseDto } from '../../types';

interface LandingIntroProps {
  onCreateParty: () => void;
  currentUser?: AuthResponseDto | null;
  onOpenAuthModal?: () => void;
}

export const LandingIntro: React.FC<LandingIntroProps> = ({
  onCreateParty,
  currentUser,
  onOpenAuthModal,
}) => {
  const [activeStage, setActiveStage] = useState<0 | 1 | 2>(0);

  // Auto-advance stages every 4.5 seconds for a dynamic visual presentation
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStage((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto py-8 sm:py-12 px-4 select-none flex flex-col items-center">
      {/* Top Header Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171A23] border border-white/10 text-xs font-mono text-[#C6FF3D] mb-6 shadow-sm"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#C6FF3D]" />
        <span>AUTONOMOUS GROUP TREASURY</span>
      </motion.div>

      {/* Main Title & Teaser */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="text-center space-y-4 max-w-3xl mb-10"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Logo size="lg" />
        </div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold text-[#EDEEF2] tracking-tight leading-[1.08] m-0">
          Split travel bills. <br />
          <span className="text-[#C6FF3D]">Settle without awkwardness.</span>
        </h1>
        <p className="text-sm sm:text-base text-[#8A8FA3] font-body max-w-xl mx-auto m-0 leading-relaxed">
          Upload any paper bill, watch line items slice automatically, and let PayPal settle group balances with zero math drift.
        </p>
      </motion.div>

      {/* Interactive Stage Visualizer */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-full rounded-3xl bg-[#0F1117] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-5 sm:p-8 space-y-6 relative overflow-hidden"
      >
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* 3 Step Interactive Switcher Tabs */}
        <div className="flex items-center justify-center gap-2 z-10 relative">
          <div className="flex items-center p-1 rounded-2xl bg-[#07080D] border border-white/8">
            {[
              { idx: 0, label: '01. Scan & Slice', icon: <Receipt className="w-3.5 h-3.5" /> },
              { idx: 1, label: '02. Minimize Debts', icon: <Layers className="w-3.5 h-3.5" /> },
              { idx: 2, label: '03. PayPal 1-Tap Settle', icon: <CreditCard className="w-3.5 h-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.idx}
                onClick={() => setActiveStage(tab.idx as 0 | 1 | 2)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  activeStage === tab.idx
                    ? 'bg-[#171A23] text-[#C6FF3D] font-bold border border-white/10 shadow-md'
                    : 'text-[#8A8FA3] hover:text-[#EDEEF2]'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Animated Scene Container */}
        <div className="relative min-h-[300px] sm:min-h-[320px] rounded-2xl bg-[#07080D] border border-white/6 p-6 sm:p-8 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            {/* SCENE 1: RECEIPT LASER SLICER ANIMATION */}
            {activeStage === 0 && (
              <motion.div
                key="stage_0"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-lg space-y-4"
              >
                <div className="flex items-center justify-between text-xs font-mono text-[#8A8FA3] border-b border-white/8 pb-2">
                  <div className="flex items-center gap-2 text-[#C6FF3D]">
                    <span className="w-2 h-2 rounded-full bg-[#C6FF3D] animate-ping" />
                    <span>MULTIMODAL RECEIPT SLICER</span>
                  </div>
                  <span>VISION OCR VERIFIED</span>
                </div>

                {/* Simulated Paper Bill with Slicing Laser */}
                <div className="relative rounded-2xl bg-[#171A23] border border-white/10 p-5 space-y-3 overflow-hidden">
                  {/* Glowing Laser Scanline */}
                  <motion.div
                    initial={{ top: '0%' }}
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    className="absolute left-0 right-0 h-0.5 bg-[#C6FF3D] shadow-[0_0_16px_4px_#C6FF3D] pointer-events-none z-20"
                  />

                  {/* Sliced Line Items Spreading Out */}
                  {[
                    { name: 'Dinner & Tapas Platter', price: '₹1,200', tag: 'Claimed by 2 Members' },
                    { name: 'Weekend Villa / Hotel Stay', price: '₹6,000', tag: 'Split Across All Travelers' },
                    { name: 'Fresh Cold Brew & Pastries', price: '₹400', tag: 'Fronted by Single Member' },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + idx * 0.15 }}
                      className="p-3 rounded-xl bg-[#07080D] border border-white/6 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="text-[#EDEEF2] font-body font-semibold">{item.name}</div>
                        <div className="text-[10px] text-[#8A8FA3] mt-0.5">{item.tag}</div>
                      </div>
                      <span className="text-[#C6FF3D] font-bold text-sm tabular-nums">
                        {item.price}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SCENE 2: BIPARTITE MINIMUM CASH FLOW (TOPOLOGY) */}
            {activeStage === 1 && (
              <motion.div
                key="stage_1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-lg space-y-4"
              >
                <div className="flex items-center justify-between text-xs font-mono text-[#8A8FA3] border-b border-white/8 pb-2">
                  <span className="text-[#C6FF3D]">BIPARTITE CASH FLOW TOPOLOGY</span>
                  <span>O(V+E) MINIMIZED</span>
                </div>

                <div className="p-6 rounded-2xl bg-[#171A23] border border-white/10 space-y-5">
                  {/* Visual Node Connection */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Debtor Node */}
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#FF5C7A]/15 border border-[#FF5C7A]/40 flex items-center justify-center font-bold font-mono text-[#FF5C7A]">
                        D1
                      </div>
                      <span className="text-xs font-semibold text-[#EDEEF2]">Debtor Traveler</span>
                      <span className="text-[10px] font-mono text-[#FF5C7A] font-bold">-₹1,200</span>
                    </motion.div>

                    {/* Animated Cash Flow Vector */}
                    <div className="flex-1 flex flex-col items-center gap-1.5 px-3">
                      <div className="text-[10px] font-mono text-[#8A8FA3] uppercase tracking-wider">
                        Direct Transit
                      </div>
                      <div className="w-full h-1 bg-white/10 relative overflow-hidden rounded-full">
                        <motion.div
                          animate={{ left: ['-20%', '100%'] }}
                          transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                          className="absolute top-0 bottom-0 w-1/3 bg-[#C6FF3D] rounded-full shadow-[0_0_12px_#C6FF3D]"
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[#C6FF3D] font-bold">
                        ₹1,200 (Single Transaction)
                      </span>
                    </div>

                    {/* Creditor Node */}
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#C6FF3D]/15 border border-[#C6FF3D]/40 flex items-center justify-center font-bold font-mono text-[#C6FF3D]">
                        C1
                      </div>
                      <span className="text-xs font-semibold text-[#EDEEF2]">Fronting Member</span>
                      <span className="text-[10px] font-mono text-[#C6FF3D] font-bold">+₹1,200</span>
                    </motion.div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080D] border border-white/6 text-center text-xs font-mono text-[#8A8FA3]">
                    Multi-person circular splits collapsed into direct transfers. Zero remainder drift.
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCENE 3: PAYPAL 1-TAP SETTLEMENT */}
            {activeStage === 2 && (
              <motion.div
                key="stage_2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-lg space-y-4"
              >
                <div className="flex items-center justify-between text-xs font-mono text-[#8A8FA3] border-b border-white/8 pb-2">
                  <span className="text-[#FFC439]">PAYPAL ORDERS V2 ESCROW</span>
                  <span className="text-[#C6FF3D]">1-TAP REIMBURSEMENT</span>
                </div>

                <div className="p-6 rounded-2xl bg-[#171A23] border border-white/10 space-y-4">
                  {/* Settlement Card Preview */}
                  <div className="p-4 rounded-xl bg-[#07080D] border border-white/6 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-[#8A8FA3] font-mono uppercase">Direct Settlement</div>
                      <div className="text-lg font-mono font-bold text-[#EDEEF2] mt-0.5">
                        ₹1,200.00 <span className="text-xs text-[#8A8FA3] font-normal">INR</span>
                      </div>
                    </div>

                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                      className="px-3 py-1.5 rounded-xl bg-[#FFC439] text-[#07080D] text-xs font-bold font-body flex items-center gap-1.5 shadow-[0_0_16px_rgba(255,196,57,0.3)]"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Settle with PayPal</span>
                    </motion.div>
                  </div>

                  {/* Confirmed State Pill */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="p-3 rounded-xl bg-[#C6FF3D]/10 border border-[#C6FF3D]/30 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 text-[#C6FF3D]">
                      <CheckCircle className="w-4 h-4" />
                      <span>Webhook Verified: Escrow Captured</span>
                    </div>
                    <span className="text-[#EDEEF2] font-bold">0.00 Drift</span>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-[#07080D] border border-white/6 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-[#C6FF3D]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#EDEEF2]">1. Multimodal OCR</div>
              <div className="text-[11px] text-[#8A8FA3] mt-0.5">Upload any receipt to slice items automatically.</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#07080D] border border-white/6 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-[#FFC439]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#EDEEF2]">2. Minimum Cash Flow</div>
              <div className="text-[11px] text-[#8A8FA3] mt-0.5">Reduces complex group debts into direct transfers.</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#07080D] border border-white/6 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#C6FF3D]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#EDEEF2]">3. PayPal Escrow</div>
              <div className="text-[11px] text-[#8A8FA3] mt-0.5">One-click member checkouts and batch payouts.</div>
            </div>
          </div>
        </div>

        {/* Action Button: Create Party & Sign In */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <Button
            variant="primary"
            size="lg"
            onClick={onCreateParty}
            icon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto text-sm font-display font-bold shadow-[0_0_24px_rgba(198,255,61,0.25)] px-10 py-3.5"
          >
            Create Your Party
          </Button>

          {!currentUser && onOpenAuthModal && (
            <Button
              variant="secondary"
              size="lg"
              onClick={onOpenAuthModal}
              icon={<LogIn className="w-4 h-4" />}
              className="w-full sm:w-auto text-sm font-display font-medium px-8 py-3.5"
            >
              Sign In to Account
            </Button>
          )}

          {currentUser && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#07080D] border border-white/8 text-xs font-mono text-[#C6FF3D]">
              <span className="w-2 h-2 rounded-full bg-[#C6FF3D]" />
              <span>Signed in as {currentUser.name} ({currentUser.handle})</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
