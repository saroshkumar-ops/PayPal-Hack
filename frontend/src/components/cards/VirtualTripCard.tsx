import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, ShieldCheck, Sparkles } from 'lucide-react';

interface VirtualTripCardProps {
  balanceCents: number;
  tripName: string;
  organizerName: string;
  organizerEmail?: string;
  onPayout: () => void;
}

export const VirtualTripCard: React.FC<VirtualTripCardProps> = ({
  balanceCents,
  tripName,
  organizerName,
  organizerEmail = 'sarah.chen@trip.mock',
  onPayout,
}) => {
  const formattedBalance = (balanceCents / 100).toFixed(2);

  return (
    <div className="relative w-full flex items-center justify-center py-6 select-none">
      {/* Decorative Squiggle Wire underneath (matching CyberBank hero) */}
      <svg
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-72 sm:w-80 h-16 pointer-events-none opacity-40"
        viewBox="0 0 320 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 10 30 Q 60 5 110 35 T 210 25 Q 260 55 310 20"
          stroke="#8199AE"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="4 2"
        />
      </svg>

      <div className="relative w-full max-w-[420px] h-[280px] sm:h-[300px] flex items-center justify-center">
        {/* ============================================================== */}
        {/* BACK CARD (Secondary Cyan/Slate Tilted Card)                     */}
        {/* ============================================================== */}
        <motion.div
          initial={{ rotate: -10, y: 20, x: -10 }}
          animate={{ rotate: -10, y: 20, x: -10 }}
          whileHover={{ rotate: -6, y: 12, x: -6 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          className="absolute w-[290px] sm:w-[330px] h-[175px] sm:h-[200px] rounded-2xl sm:rounded-3xl p-5 border border-[#4E6A83]/30 shadow-2xl flex flex-col justify-between overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #10161C 0%, #1F2C38 55%, #33475A 100%)',
            boxShadow: '0 20px 40px -15px rgba(16, 22, 28, 0.9), inset 0 1px 0 rgba(183, 198, 211, 0.1)',
          }}
        >
          {/* Subtle grid texture */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#8199AE_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Back Card Top: Contactless & Brand */}
          <div className="flex items-center justify-between relative z-10">
            <Wifi className="w-4 h-4 text-[#8199AE] rotate-90" />
            <span className="text-[10px] font-mono tracking-widest text-[#8199AE] uppercase truncate max-w-[180px]">
              {tripName.toUpperCase()}
            </span>
          </div>

          {/* Back Card Mid: Card Number */}
          <div className="relative z-10 font-mono text-xs sm:text-sm tracking-[0.2em] text-[#B7C6D3]/70 font-semibold">
            1253 •••• •••• 3090
          </div>

          {/* Back Card Bottom: Expiry & CVV */}
          <div className="flex items-center justify-between relative z-10 text-[10px] font-mono text-[#8199AE]">
            <div>
              <span className="text-[9px] uppercase tracking-wider block text-[#4E6A83]">Expires</span>
              <span>09/28</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider block text-[#4E6A83]">CVV</span>
              <span>341</span>
            </div>
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/* FRONT CARD (Primary Holographic Iridescent Tilted Card)        */}
        {/* ============================================================== */}
        <motion.div
          initial={{ rotate: -20, y: -10, x: 15 }}
          animate={{ rotate: -20, y: -10, x: 15 }}
          whileHover={{ rotate: -15, y: -18, x: 12, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="absolute w-[305px] sm:w-[350px] h-[190px] sm:h-[215px] rounded-2xl sm:rounded-3xl p-5 border border-[#8199AE]/40 shadow-2xl flex flex-col justify-between overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #1F2C38 0%, #33475A 35%, #4E6A83 70%, #8199AE 100%)',
            boxShadow: '0 25px 50px -12px rgba(16, 22, 28, 0.95), inset 0 1px 2px rgba(231, 237, 242, 0.4)',
          }}
        >
          {/* Holographic Iridescent Sweeper */}
          <div 
            className="pointer-events-none absolute inset-0 opacity-45 mix-blend-color-dodge"
            style={{
              background: 'radial-gradient(circle at 85% 15%, rgba(231, 237, 242, 0.5) 0%, rgba(183, 198, 211, 0.3) 30%, transparent 70%)',
            }}
          />

          {/* Radiant Sunburst Ray Marks (above top right, just like the video!) */}
          <div className="absolute -top-1 -right-1 w-14 h-14 pointer-events-none opacity-40">
            <svg viewBox="0 0 40 40" fill="none">
              <path d="M 32 8 L 38 2" stroke="#E7EDF2" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 28 4 L 30 -2" stroke="#E7EDF2" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 36 12 L 42 14" stroke="#E7EDF2" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Front Card Header: Branding & Network */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-[#10161C] border border-[#4E6A83] flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-[#B7C6D3]" />
              </div>
              <span className="text-[11px] font-bold tracking-tight text-[#E7EDF2] font-mono uppercase">
                TripSheriff
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-[#E7EDF2] rotate-90" />
              <span className="text-xs font-black tracking-wider text-[#E7EDF2] font-mono">
                RuPay
              </span>
            </div>
          </div>

          {/* EMV Brushed Chip & Grouped Card Digits */}
          <div className="relative z-10 my-0.5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-6 rounded-md bg-gradient-to-br from-[#B7C6D3] via-[#8199AE] to-[#33475A] border border-[#E7EDF2]/40 p-1 flex flex-col justify-between shadow-inner">
                <div className="w-full h-[1px] bg-[#10161C]/50" />
                <div className="w-full h-[1px] bg-[#10161C]/50" />
              </div>
              <span className="text-[10px] text-[#E7EDF2]/90 font-mono tracking-wider">
                PAYPAL TREASURY
              </span>
            </div>

            <div className="font-mono text-sm sm:text-base font-bold tracking-[0.22em] text-[#E7EDF2] drop-shadow-md">
              4532 8912 3521 8821
            </div>
          </div>

          {/* Front Card Bottom: Balance & Payout Trigger */}
          <div className="flex items-end justify-between relative z-10 pt-2 border-t border-[#E7EDF2]/20">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#B7C6D3] font-semibold">
                Reimbursable Balance
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-[#E7EDF2] tracking-tight flex items-baseline gap-1">
                <span>₹{formattedBalance}</span>
                <span className="text-[10px] text-[#B7C6D3] font-sans font-normal">INR</span>
              </div>
              <div className="text-[9px] text-[#B7C6D3] font-mono truncate max-w-[160px]">
                {organizerName.toUpperCase()}
              </div>
              <div className="text-[8px] text-[#8199AE] font-mono truncate max-w-[160px]">
                {organizerEmail}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onPayout();
              }}
              title="1-Click Batch Payout to Organizer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#10161C] hover:bg-[#1F2C38] border border-[#8199AE]/40 text-[#E7EDF2] text-[11px] font-semibold shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-3 h-3 text-[#B7C6D3]" />
              <span>Batch Payout</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
