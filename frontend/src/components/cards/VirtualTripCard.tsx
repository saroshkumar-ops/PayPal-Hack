import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Wifi, Sparkles, RefreshCw, QrCode, Lock } from 'lucide-react';

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

  // Active card: 'treasury' (front) or 'reserve' (back)
  const [activeCard, setActiveCard] = useState<'treasury' | 'reserve'>('treasury');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 3D Parallax Mouse Tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring physics for buttery 60fps tilt
  const springConfig = { stiffness: 180, damping: 20 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [14, -14]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-18, 18]);
  const glareX = useTransform(smoothX, [-0.5, 0.5], [15, 85]);
  const glareY = useTransform(smoothY, [-0.5, 0.5], [15, 85]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  const toggleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped((prev) => !prev);
  };

  const swapActiveCard = (card: 'treasury' | 'reserve') => {
    setActiveCard(card);
    setIsFlipped(false);
  };

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-2 sm:py-4 select-none">
      {/* Top interactive card toggle controls */}
      <div className="flex items-center gap-2 mb-4 z-20">
        <div className="flex items-center p-1 rounded-xl bg-[#0F1117] border border-white/8 shadow-md">
          <button
            onClick={() => swapActiveCard('treasury')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
              activeCard === 'treasury'
                ? 'bg-[#171A23] text-[#C6FF3D] border border-white/8'
                : 'text-[#8A8FA3] hover:text-[#EDEEF2]'
            }`}
          >
            Treasury Rail
          </button>
          <button
            onClick={() => swapActiveCard('reserve')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
              activeCard === 'reserve'
                ? 'bg-[#171A23] text-[#C6FF3D] border border-white/8'
                : 'text-[#8A8FA3] hover:text-[#EDEEF2]'
            }`}
          >
            Reserve Vault
          </button>
        </div>

        <button
          onClick={toggleFlip}
          title="Flip card in 3D"
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0F1117] hover:bg-[#171A23] border border-white/8 text-[#8A8FA3] hover:text-[#EDEEF2] text-xs font-mono transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Flip 3D</span>
        </button>
      </div>

      {/* 3D Perspective Card Stage */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative w-full max-w-[440px] h-[300px] sm:h-[320px] flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ perspective: 1200 }}
      >
        {/* CARD 1: TREASURY CARD */}
        <motion.div
          onClick={() => {
            if (activeCard !== 'treasury') swapActiveCard('treasury');
          }}
          style={{
            rotateX: activeCard === 'treasury' ? rotateX : 0,
            rotateY: activeCard === 'treasury' ? (isFlipped ? 180 : rotateY) : 0,
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
            zIndex: activeCard === 'treasury' ? 20 : 10,
          }}
          animate={{
            x: activeCard === 'treasury' ? (isHovered ? 8 : 12) : (isHovered ? 40 : 20),
            y: activeCard === 'treasury' ? (isHovered ? -20 : -14) : (isHovered ? 24 : 16),
            rotateZ: activeCard === 'treasury' ? (isHovered ? -12 : -15) : (isHovered ? -18 : -14),
            scale: activeCard === 'treasury' ? (isHovered ? 1.04 : 1.0) : 0.94,
            opacity: activeCard === 'treasury' ? 1 : 0.82,
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="absolute w-[320px] sm:w-[380px] h-[200px] sm:h-[235px] rounded-2xl p-6 border border-white/12 shadow-[0_24px_50px_rgba(0,0,0,0.9)] flex flex-col justify-between overflow-hidden cursor-pointer"
        >
          {/* FRONT FACE */}
          <div
            className={`absolute inset-0 p-6 flex flex-col justify-between transition-opacity duration-300 ${
              isFlipped && activeCard === 'treasury' ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            style={{
              background: 'linear-gradient(135deg, #171A23 0%, #0F1117 50%, #07080D 100%)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.12)',
            }}
          >
            {/* Dynamic Specular Glare */}
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-40 mix-blend-color-dodge transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(198, 255, 61, 0.25) 0%, rgba(255, 255, 255, 0.08) 35%, transparent 70%)`,
              }}
            />

            {/* Card Header: Branding & Network */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#07080D] border border-white/12 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-[#C6FF3D]" />
                </div>
                <span className="text-xs font-display font-semibold tracking-tight text-[#EDEEF2]">
                  TripSheriff Treasury
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#8A8FA3] rotate-90" />
                <span className="text-xs font-display font-bold tracking-wider text-[#EDEEF2]">
                  RuPay
                </span>
              </div>
            </div>

            {/* Chip & Grouped Card Digits */}
            <div className="relative z-10 my-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-6 rounded-md bg-[#1F2C38] border border-white/16 p-1 flex flex-col justify-between shadow-inner">
                  <div className="w-full h-[1.5px] bg-[#C6FF3D]/40" />
                  <div className="w-full h-[1.5px] bg-white/20" />
                </div>
                <span className="text-[10px] text-[#8A8FA3] font-mono tracking-widest uppercase">
                  PAYPAL ESCROW RAIL
                </span>
              </div>

              <div className="font-mono text-base sm:text-lg font-semibold tracking-[0.2em] text-[#EDEEF2] tabular-nums">
                4532 8912 3521 8821
              </div>
            </div>

            {/* Card Bottom: Balance & Payout Trigger */}
            <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/8">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#8A8FA3] font-mono">
                  Reimbursable Balance
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-[#EDEEF2] tracking-tight flex items-baseline gap-1 mt-0.5">
                  <span className="text-[#C6FF3D]">₹</span>
                  <span className="tabular-nums">{formattedBalance}</span>
                  <span className="text-[10px] text-[#8A8FA3] font-normal">INR</span>
                </div>
                <div
                  className="text-[11px] text-[#8A8FA3] font-body truncate max-w-[140px] sm:max-w-[170px]"
                  title={organizerEmail}
                >
                  {organizerName}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPayout();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFC439] hover:bg-[#f5b828] text-[#07080D] text-xs font-bold font-body transition-all shadow-[0_0_16px_rgba(255,196,57,0.25)] cursor-pointer"
              >
                <span>Batch Payout</span>
              </button>
            </div>
          </div>

          {/* BACK FACE (FLIPPED) */}
          <div
            className={`absolute inset-0 p-6 flex flex-col justify-between bg-[#0F1117] transition-opacity duration-300 [transform:rotateY(180deg)] ${
              isFlipped && activeCard === 'treasury' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="h-9 w-full bg-[#07080D] border-y border-white/8 -mx-6 my-1" />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#8A8FA3]">CVV SECURED</span>
                <span className="bg-[#171A23] border border-white/12 px-2.5 py-0.5 rounded text-[#EDEEF2] font-mono">
                  341
                </span>
              </div>
              <div className="text-[10px] font-mono text-[#8A8FA3] flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#C6FF3D]" />
                <span>Double-Entry Zero Drift Guarantee</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#8A8FA3] truncate">
              ID: {tripName}
            </div>
          </div>
        </motion.div>

        {/* CARD 2: RESERVE VAULT (UNDERNEATH) */}
        <motion.div
          onClick={() => {
            if (activeCard !== 'reserve') swapActiveCard('reserve');
          }}
          style={{
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
            zIndex: activeCard === 'reserve' ? 20 : 10,
          }}
          animate={{
            x: activeCard === 'reserve' ? 0 : 24,
            y: activeCard === 'reserve' ? 0 : 22,
            rotateZ: activeCard === 'reserve' ? -2 : 6,
            scale: activeCard === 'reserve' ? 1.0 : 0.92,
            opacity: activeCard === 'reserve' ? 1 : 0.7,
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="absolute w-[320px] sm:w-[380px] h-[200px] sm:h-[235px] rounded-2xl p-6 border border-white/10 bg-[#0F1117] shadow-2xl flex flex-col justify-between overflow-hidden cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-semibold text-[#EDEEF2]">
              Reserve Liquidity Pool
            </span>
            <QrCode className="w-4 h-4 text-[#8A8FA3]" />
          </div>

          <div className="p-3 rounded-xl bg-[#07080D] border border-white/8 space-y-1">
            <div className="text-[10px] text-[#8A8FA3] font-mono">ESCROW CONTRACT</div>
            <div className="text-xs font-mono text-[#C6FF3D] truncate">
              0x71C...BIPARTITE_SETTLED
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-[#8A8FA3]">
            <span>Status: Verified</span>
            <span className="text-[#EDEEF2]">₹0.00 Drift</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
