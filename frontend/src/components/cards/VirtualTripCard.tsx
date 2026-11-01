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
    <div className="relative w-full flex items-center justify-center py-4 sm:py-8 select-none">
      {/* Decorative Whimsical Squiggle Wire underneath (matching CyberBank hero) */}
      <svg
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-20 pointer-events-none opacity-40"
        viewBox="0 0 360 70"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 10 35 Q 70 5 130 40 T 240 30 Q 300 65 350 25"
          stroke="#8199AE"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="5 3"
        />
      </svg>

      <div className="relative w-full max-w-[460px] h-[310px] sm:h-[340px] flex items-center justify-center">
        {/* ============================================================== */}
        {/* BACK CARD (Secondary Slate Tilted Card with Gentle Float)       */}
        {/* ============================================================== */}
        <motion.div
          animate={{
            y: [18, 26, 18],
            rotate: [-10, -11.5, -10],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.6,
          }}
          whileHover={{ rotate: -7, y: 14, scale: 1.02 }}
          className="absolute w-[310px] sm:w-[370px] h-[190px] sm:h-[225px] rounded-3xl p-6 border border-[#4E6A83]/40 shadow-2xl flex flex-col justify-between overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #10161C 0%, #1F2C38 60%, #33475A 100%)',
            boxShadow: '0 25px 50px -15px rgba(16, 22, 28, 0.95), inset 0 1px 0 rgba(183, 198, 211, 0.15)',
            transformOrigin: 'center center',
          }}
        >
          {/* Subtle blueprint grid texture */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#8199AE_1px,transparent_1px)] [background-size:18px_18px]" />

          {/* Back Card Top: Contactless & Brand */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-[#8199AE] rotate-90" />
              <span className="text-xs font-mono tracking-widest text-[#8199AE] uppercase font-bold">
                RESERVE POOL
              </span>
            </div>
            <span className="text-xs font-mono font-bold tracking-wider text-[#8199AE] uppercase truncate max-w-[170px]">
              {tripName}
            </span>
          </div>

          {/* Back Card Mid: Card Number */}
          <div className="relative z-10 font-mono text-sm sm:text-base tracking-[0.25em] text-[#B7C6D3]/70 font-bold">
            1253 •••• •••• 3090
          </div>

          {/* Back Card Bottom: Expiry & Security CVV */}
          <div className="flex items-center justify-between relative z-10 text-xs font-mono text-[#8199AE]">
            <div>
              <span className="text-[11px] uppercase tracking-wider block text-[#4E6A83] font-semibold">Valid Thru</span>
              <span className="text-[#B7C6D3] font-bold text-sm">09/28</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider block text-[#4E6A83] font-semibold">CVV</span>
              <span className="text-[#B7C6D3] font-bold text-sm">341</span>
            </div>
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/* FRONT CARD (Holographic Iridescent Tilted Card with Float)      */}
        {/* ============================================================== */}
        <motion.div
          animate={{
            y: [-12, -22, -12],
            rotate: [-20, -18.5, -20],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          whileHover={{
            rotate: -14,
            y: -28,
            scale: 1.04,
            boxShadow: '0 35px 60px -15px rgba(16, 22, 28, 1), inset 0 2px 3px rgba(231, 237, 242, 0.5)',
          }}
          className="absolute w-[325px] sm:w-[390px] h-[205px] sm:h-[240px] rounded-3xl p-6 sm:p-7 border border-[#8199AE]/50 shadow-2xl flex flex-col justify-between overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #1F2C38 0%, #33475A 35%, #4E6A83 70%, #8199AE 100%)',
            boxShadow: '0 30px 60px -15px rgba(16, 22, 28, 0.95), inset 0 1px 2px rgba(231, 237, 242, 0.4)',
            transformOrigin: 'center center',
          }}
        >
          {/* Holographic Iridescent Foil Sweeper */}
          <div 
            className="pointer-events-none absolute inset-0 opacity-50 mix-blend-color-dodge"
            style={{
              background: 'radial-gradient(circle at 85% 15%, rgba(231, 237, 242, 0.6) 0%, rgba(183, 198, 211, 0.35) 35%, transparent 70%)',
            }}
          />

          {/* Radiant Sunburst Ray Marks (from the video!) */}
          <div className="absolute -top-1 -right-1 w-16 h-16 pointer-events-none opacity-50">
            <svg viewBox="0 0 50 50" fill="none">
              <path d="M 40 10 L 48 2" stroke="#E7EDF2" strokeWidth="2" strokeLinecap="round" />
              <path d="M 34 5 L 37 -3" stroke="#E7EDF2" strokeWidth="2" strokeLinecap="round" />
              <path d="M 45 16 L 53 19" stroke="#E7EDF2" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Front Card Header: Branding & Network */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#10161C] border border-[#4E6A83] flex items-center justify-center shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#B7C6D3]" />
              </div>
              <span className="text-xs sm:text-sm font-black tracking-tight text-[#E7EDF2] font-mono uppercase">
                TripSheriff Treasury
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Wifi className="w-5 h-5 text-[#E7EDF2] rotate-90" />
              <span className="text-sm font-black tracking-widest text-[#E7EDF2] font-mono">
                RuPay
              </span>
            </div>
          </div>

          {/* EMV Brushed Chip & Grouped Card Digits */}
          <div className="relative z-10 my-1">
            <div className="flex items-center gap-3.5 mb-2.5">
              {/* Metallic Chip */}
              <div className="w-11 h-7 rounded-lg bg-gradient-to-br from-[#E7EDF2] via-[#8199AE] to-[#33475A] border border-[#E7EDF2]/60 p-1 flex flex-col justify-between shadow-inner">
                <div className="w-full h-[1.5px] bg-[#10161C]/50" />
                <div className="w-full h-[1.5px] bg-[#10161C]/50" />
              </div>
              <span className="text-xs text-[#E7EDF2] font-mono font-semibold tracking-widest uppercase">
                PAYPAL ESCROW
              </span>
            </div>

            {/* Embossed Card Numbers (Bigger & High Contrast) */}
            <div className="font-mono text-base sm:text-lg lg:text-xl font-black tracking-[0.22em] text-[#E7EDF2] drop-shadow-md">
              4532 8912 3521 8821
            </div>
          </div>

          {/* Front Card Bottom: Balance & Payout Trigger */}
          <div className="flex items-end justify-between relative z-10 pt-2.5 border-t border-[#E7EDF2]/25">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#B7C6D3] font-bold">
                Reimbursable Balance
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-[#E7EDF2] tracking-tight flex items-baseline gap-1.5 mt-0.5">
                <span>₹{formattedBalance}</span>
                <span className="text-xs text-[#B7C6D3] font-sans font-normal">INR</span>
              </div>
              <div className="text-xs text-[#E7EDF2] font-mono font-semibold truncate max-w-[170px] mt-0.5">
                {organizerName.toUpperCase()}
              </div>
              <div className="text-[10px] text-[#8199AE] font-mono truncate max-w-[170px]">
                {organizerEmail}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onPayout();
              }}
              title="1-Click Batch Payout to Organizer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10161C] hover:bg-[#1F2C38] border border-[#8199AE]/50 text-[#E7EDF2] text-xs font-bold shadow-xl transition-all active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#B7C6D3]" />
              <span>Batch Payout</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
