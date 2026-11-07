import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { RefreshCw, Wallet, CheckCircle } from 'lucide-react';
import { getCurrencySymbol } from '../../lib/currency';

interface VirtualTripCardProps {
  balanceCents: number;
  tripName: string;
  organizerName: string;
  organizerEmail?: string;
  currency?: string;
  onPayout: () => void;
}

export const VirtualTripCard: React.FC<VirtualTripCardProps> = ({
  balanceCents,
  tripName,
  organizerName,
  organizerEmail,
  currency = 'INR',
  onPayout,
}) => {
  const formattedBalance = (balanceCents / 100).toFixed(2);
  const curSymbol = getCurrencySymbol(currency);
  const curCode = currency?.toUpperCase() === 'USD' ? 'USD' : 'INR';
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 3D Parallax Mouse Tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for 60fps tilt
  const springConfig = { stiffness: 180, damping: 20 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-16, 16]);
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

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-2 select-none">
      {/* Top controls: Flip toggle */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <span className="text-[11px] font-mono text-[#8A8FA3] uppercase tracking-wider">
          ESCROW LIQUIDITY CARD
        </span>
        <button
          onClick={toggleFlip}
          title="Flip card in 3D"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F1117] hover:bg-[#171A23] border border-white/8 text-[#8A8FA3] hover:text-[#EDEEF2] text-xs font-mono transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Flip</span>
        </button>
      </div>

      {/* 3D Perspective Card Stage */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative w-full max-w-[400px] h-[220px] sm:h-[230px] flex items-center justify-center cursor-pointer"
        style={{ perspective: 1200 }}
      >
        <motion.div
          style={{
            rotateX: rotateX,
            rotateY: isFlipped ? 180 : rotateY,
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
          }}
          animate={{
            scale: isHovered ? 1.02 : 1.0,
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="w-full h-full rounded-2xl border border-white/12 shadow-[0_24px_50px_rgba(0,0,0,0.85)] relative overflow-hidden"
        >
          {/* FRONT FACE */}
          <div
            className={`absolute inset-0 p-5 sm:p-6 flex flex-col justify-between transition-opacity duration-300 ${
              isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            style={{
              background: 'linear-gradient(135deg, #171A23 0%, #0F1117 60%, #07080D 100%)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Dynamic Specular Glare */}
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-30 mix-blend-color-dodge transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(255, 255, 255, 0.08) 0%, transparent 60%)`,
              }}
            />

            {/* Card Header: Trip Name & Escrow Status */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#07080D] border border-white/10 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-[#C6FF3D]" />
                </div>
                <span className="text-xs font-display font-bold tracking-tight text-[#EDEEF2] truncate max-w-[180px]">
                  {tripName}
                </span>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#C6FF3D]/10 text-[#C6FF3D] border border-[#C6FF3D]/30">
                PayPal Escrow
              </span>
            </div>

            {/* Card Core: Balance Display */}
            <div className="relative z-10 my-1">
              <div className="text-[10px] uppercase tracking-wider text-[#8A8FA3] font-mono">
                Reimbursable Balance
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#EDEEF2] tracking-tight flex items-baseline gap-1 mt-0.5">
                <span className="text-[#C6FF3D]">{curSymbol}</span>
                <span className="tabular-nums">{formattedBalance}</span>
                <span className="text-[11px] text-[#8A8FA3] font-normal font-mono">{curCode}</span>
              </div>
            </div>

            {/* Card Footer: Organizer & Payout Trigger */}
            <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/8">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#8A8FA3] font-mono">
                  Receiver
                </div>
                <div className="text-xs font-semibold text-[#EDEEF2] font-body truncate max-w-[180px]">
                  {organizerName}
                </div>
                {organizerEmail && (
                  <div className="text-[10px] text-[#8A8FA3] font-mono truncate max-w-[180px]">
                    {organizerEmail}
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPayout();
                }}
                disabled={balanceCents <= 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFC439] hover:bg-[#f5b828] disabled:opacity-40 disabled:cursor-not-allowed text-[#07080D] text-xs font-bold font-body transition-all cursor-pointer"
              >
                <span>Batch Payout</span>
              </button>
            </div>
          </div>

          {/* BACK FACE (FLIPPED) */}
          <div
            className={`absolute inset-0 p-5 sm:p-6 flex flex-col justify-between bg-[#0F1117] transition-opacity duration-300 [transform:rotateY(180deg)] ${
              isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/8 pb-2">
              <span className="text-xs font-display font-semibold text-[#EDEEF2]">
                Trip Ledger Details
              </span>
              <span className="text-[10px] font-mono text-[#C6FF3D]">Double-Entry</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-[#8A8FA3]">
                <span>Trip ID:</span>
                <span className="text-[#EDEEF2] truncate max-w-[180px]">{tripName}</span>
              </div>
              <div className="flex justify-between text-[#8A8FA3]">
                <span>Settlement Protocol:</span>
                <span className="text-[#EDEEF2]">Bipartite Flow</span>
              </div>
              <div className="flex justify-between text-[#8A8FA3]">
                <span>Balance Status:</span>
                <span className={balanceCents > 0 ? 'text-[#FFC439]' : 'text-[#C6FF3D]'}>
                  {balanceCents > 0 ? 'Awaiting Payout' : 'Fully Settled'}
                </span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#C6FF3D] flex items-center gap-1.5 pt-2 border-t border-white/8">
              <CheckCircle className="w-3 h-3" />
              <span>Zero-Drift Mathematical Balance</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
