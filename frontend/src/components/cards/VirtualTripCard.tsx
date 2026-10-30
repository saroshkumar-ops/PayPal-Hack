import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '../common/Logo';

interface VirtualTripCardProps {
  balanceCents: number;
  tripName: string;
  organizerName: string;
  onPayout: () => void;
}

export const VirtualTripCard: React.FC<VirtualTripCardProps> = ({
  balanceCents,
  tripName,
  organizerName,
  onPayout,
}) => {
  const formattedBalance = (balanceCents / 100).toFixed(2);

  return (
    <div className="relative group perspective-1000">
      {/* 3D Holographic Card Container */}
      <motion.div
        whileHover={{ y: -4, rotateX: 2, rotateY: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative h-56 w-full rounded-3xl p-6 overflow-hidden border border-white/[0.12] shadow-2xl flex flex-col justify-between"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0c0a09 100%)',
          boxShadow: '0 25px 50px -12px rgba(0, 112, 224, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* Holographic foil sweep animation */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay transition-opacity duration-700 group-hover:opacity-75"
          style={{
            background: 'radial-gradient(circle at 80% 20%, rgba(0, 240, 255, 0.4) 0%, rgba(147, 51, 234, 0.3) 40%, transparent 80%)',
          }}
        />

        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

        {/* Card Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" showText={false} />
            <div>
              <div className="text-[11px] font-extrabold tracking-wider text-white uppercase flex items-center gap-1.5 font-mono">
                TripSheriff Treasury
                <Sparkles className="w-3 h-3 text-[#8199AE] animate-pulse" />
              </div>
              <div className="text-[10px] text-zinc-400 font-medium">{tripName}</div>
            </div>
          </div>
          <Wifi className="w-5 h-5 text-zinc-400 rotate-90" />
        </div>

        {/* EMV Gold Chip & Contactless */}
        <div className="relative z-10 flex items-center gap-3 my-1">
          <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/60 p-1 flex flex-col justify-between shadow-inner">
            <div className="w-full h-[1px] bg-amber-700/50" />
            <div className="w-full h-[1px] bg-amber-700/50" />
          </div>
          <span className="font-mono text-[11px] text-zinc-400 tracking-widest">
            •••• 8821
          </span>
        </div>

        {/* Card Footer: Balance & Payout Trigger */}
        <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/[0.08]">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Net Reimbursable
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-white flex items-baseline gap-1">
              <span className="text-emerald-400">${formattedBalance}</span>
              <span className="text-xs text-zinc-400 font-sans font-normal">USD</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              Cardholder: <span className="text-zinc-200 font-medium">{organizerName.toUpperCase()}</span>
            </div>
          </div>

          <button
            onClick={onPayout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Batch Payout
          </button>
        </div>
      </motion.div>
    </div>
  );
};
