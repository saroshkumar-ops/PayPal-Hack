import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Wifi, ShieldCheck, Sparkles, RefreshCw, QrCode, Lock, Layers } from 'lucide-react';

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

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [16, -16]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-20, 20]);
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
    <div className="relative w-full flex flex-col items-center justify-center py-2 sm:py-6 select-none">
      {/* ============================================================== */}
      {/* TOP INTERACTIVE CARD CONTROLS (TABS & 3D FLIP TRIGGER)         */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 mb-4 z-20">
        <div className="flex items-center p-1 rounded-full bg-[#1F2C38] border border-[#33475A] shadow-lg">
          <button
            onClick={() => swapActiveCard('treasury')}
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
              activeCard === 'treasury'
                ? 'bg-[#4E6A83] text-[#E7EDF2] shadow-sm'
                : 'text-[#8199AE] hover:text-[#B7C6D3]'
            }`}
          >
            Treasury Card
          </button>
          <button
            onClick={() => swapActiveCard('reserve')}
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
              activeCard === 'reserve'
                ? 'bg-[#4E6A83] text-[#E7EDF2] shadow-sm'
                : 'text-[#8199AE] hover:text-[#B7C6D3]'
            }`}
          >
            Reserve Pool
          </button>
        </div>

        <button
          onClick={toggleFlip}
          title="Flip card in 3D to inspect security details"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-[#8199AE] hover:text-[#E7EDF2] text-xs font-mono font-bold transition-all shadow-md cursor-pointer group"
        >
          <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500 text-[#B7C6D3]" />
          <span>Flip 3D</span>
        </button>
      </div>

      {/* Decorative Whimsical Squiggle Wire underneath */}
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

      {/* 3D Perspective Card Stage */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative w-full max-w-[460px] h-[310px] sm:h-[340px] flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ perspective: 1200 }}
      >
        {/* ============================================================== */}
        {/* CARD 1: TREASURY CARD (PRIMARY RU-PAY / PAYPAL CARD)          */}
        {/* ============================================================== */}
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
            x: activeCard === 'treasury'
              ? (isHovered ? 10 : 15)
              : (isHovered ? 50 : 25),
            y: activeCard === 'treasury'
              ? (isHovered ? -26 : -18)
              : (isHovered ? 28 : 20),
            rotateZ: activeCard === 'treasury'
              ? (isHovered ? -15 : -19)
              : (isHovered ? -22 : -18),
            scale: activeCard === 'treasury'
              ? (isHovered ? 1.05 : 1.0)
              : (isHovered ? 0.96 : 0.94),
            opacity: activeCard === 'treasury' ? 1 : 0.85,
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="absolute w-[325px] sm:w-[390px] h-[205px] sm:h-[240px] rounded-3xl p-6 sm:p-7 border border-[#8199AE]/50 shadow-2xl flex flex-col justify-between overflow-hidden cursor-pointer"
        >
          {/* FRONT FACE OF TREASURY CARD */}
          <div
            className={`absolute inset-0 p-6 sm:p-7 flex flex-col justify-between transition-opacity duration-300 ${
              isFlipped && activeCard === 'treasury' ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            style={{
              background: 'linear-gradient(135deg, #1F2C38 0%, #33475A 35%, #4E6A83 70%, #8199AE 100%)',
              boxShadow: '0 30px 60px -15px rgba(16, 22, 28, 0.95), inset 0 1px 2px rgba(231, 237, 242, 0.4)',
            }}
          >
            {/* Dynamic Holographic Specular Glare (tracks mouse!) */}
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-55 mix-blend-color-dodge transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(231, 237, 242, 0.75) 0%, rgba(183, 198, 211, 0.35) 35%, transparent 70%)`,
              }}
            />

            {/* Radiant Sunburst Ray Marks */}
            <div className="absolute -top-1 -right-1 w-16 h-16 pointer-events-none opacity-50">
              <svg viewBox="0 0 50 50" fill="none">
                <path d="M 40 10 L 48 2" stroke="#E7EDF2" strokeWidth="2" strokeLinecap="round" />
                <path d="M 34 5 L 37 -3" stroke="#E7EDF2" strokeWidth="2" strokeLinecap="round" />
                <path d="M 45 16 L 53 19" stroke="#E7EDF2" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Card Header: Branding & Network */}
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
                <motion.div
                  animate={{ scale: isHovered ? [1, 1.15, 1] : 1 }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Wifi className="w-5 h-5 text-[#E7EDF2] rotate-90" />
                </motion.div>
                <span className="text-sm font-black tracking-widest text-[#E7EDF2] font-mono">
                  RuPay
                </span>
              </div>
            </div>

            {/* EMV Brushed Chip & Grouped Card Digits */}
            <div className="relative z-10 my-1">
              <div className="flex items-center gap-3.5 mb-2.5">
                <div className="w-11 h-7 rounded-lg bg-gradient-to-br from-[#E7EDF2] via-[#8199AE] to-[#33475A] border border-[#E7EDF2]/60 p-1 flex flex-col justify-between shadow-inner">
                  <div className="w-full h-[1.5px] bg-[#10161C]/50" />
                  <div className="w-full h-[1.5px] bg-[#10161C]/50" />
                </div>
                <span className="text-xs text-[#E7EDF2] font-mono font-semibold tracking-widest uppercase">
                  PAYPAL ESCROW
                </span>
              </div>

              <div className="font-mono text-base sm:text-lg lg:text-xl font-black tracking-[0.22em] text-[#E7EDF2] drop-shadow-md">
                4532 8912 3521 8821
              </div>
            </div>

            {/* Card Bottom: Balance & Payout Trigger */}
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

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPayout();
                }}
                title="1-Click Batch Payout to Organizer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10161C] hover:bg-[#1F2C38] border border-[#8199AE]/50 text-[#E7EDF2] text-xs font-bold shadow-xl transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#B7C6D3]" />
                <span>Batch Payout</span>
              </motion.button>
            </div>
          </div>

          {/* BACK FACE OF TREASURY CARD (REVEALED ON 3D FLIP) */}
          <div
            className={`absolute inset-0 p-6 sm:p-7 flex flex-col justify-between transition-opacity duration-300 [transform:rotateY(180deg)] ${
              isFlipped && activeCard === 'treasury' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              background: 'linear-gradient(135deg, #10161C 0%, #1F2C38 60%, #33475A 100%)',
              boxShadow: '0 30px 60px -15px rgba(16, 22, 28, 0.95), inset 0 1px 2px rgba(231, 237, 242, 0.2)',
            }}
          >
            {/* Magnetic Stripe */}
            <div className="-mx-6 sm:-mx-7 -mt-2 h-10 bg-[#10161C] border-y border-[#33475A] relative">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-transparent via-[#8199AE]/30 to-transparent" />
            </div>

            {/* Signature & CVV Panel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#8199AE]">AUTHORISED SIGNATURE</span>
                <span className="text-[#8199AE]">SECURITY CODE</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-8 rounded-lg bg-[#E7EDF2] flex items-center px-3 font-mono text-xs text-[#10161C] italic font-bold">
                  {organizerName}
                </div>
                <div className="w-16 h-8 rounded-lg bg-[#1F2C38] border border-[#33475A] flex items-center justify-center font-mono text-sm font-bold text-[#E7EDF2]">
                  341
                </div>
              </div>
            </div>

            {/* QR Code & Conserved Zero-Drift Guarantee */}
            <div className="flex items-center justify-between pt-2 border-t border-[#33475A]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#1F2C38] border border-[#33475A] flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-[#E7EDF2]" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#E7EDF2] flex items-center gap-1 font-mono">
                    <Lock className="w-3 h-3 text-[#8199AE]" />
                    Zero-Drift Ledger
                  </div>
                  <div className="text-[10px] text-[#8199AE] font-mono">
                    Conserved integer balance
                  </div>
                </div>
              </div>

              <button
                onClick={toggleFlip}
                className="px-3 py-1.5 rounded-lg bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-xs font-mono text-[#E7EDF2] font-semibold cursor-pointer"
              >
                Back ↻
              </button>
            </div>
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/* CARD 2: RESERVE POOL CARD (SECONDARY CYAN/SLATE CARD)           */}
        {/* ============================================================== */}
        <motion.div
          onClick={() => {
            if (activeCard !== 'reserve') swapActiveCard('reserve');
          }}
          style={{
            rotateX: activeCard === 'reserve' ? rotateX : 0,
            rotateY: activeCard === 'reserve' ? (isFlipped ? 180 : rotateY) : 0,
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
            zIndex: activeCard === 'reserve' ? 20 : 10,
            background: 'linear-gradient(135deg, #10161C 0%, #1F2C38 60%, #33475A 100%)',
            boxShadow: '0 25px 50px -15px rgba(16, 22, 28, 0.95), inset 0 1px 0 rgba(183, 198, 211, 0.15)',
          }}
          animate={{
            x: activeCard === 'reserve'
              ? (isHovered ? 10 : 15)
              : (isHovered ? -55 : -10),
            y: activeCard === 'reserve'
              ? (isHovered ? -26 : -18)
              : (isHovered ? 28 : 20),
            rotateZ: activeCard === 'reserve'
              ? (isHovered ? -15 : -19)
              : (isHovered ? -5 : -10),
            scale: activeCard === 'reserve'
              ? (isHovered ? 1.05 : 1.0)
              : (isHovered ? 0.96 : 0.94),
            opacity: activeCard === 'reserve' ? 1 : 0.85,
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="absolute w-[310px] sm:w-[370px] h-[190px] sm:h-[225px] rounded-3xl p-6 border border-[#4E6A83]/50 shadow-2xl flex flex-col justify-between overflow-hidden cursor-pointer"
        >
          {/* Subtle blueprint grid texture */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#8199AE_1px,transparent_1px)] [background-size:18px_18px]" />

          {/* Dynamic Glare on Reserve Card */}
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-40 mix-blend-color-dodge transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(183, 198, 211, 0.5) 0%, transparent 60%)`,
            }}
          />

          {/* Back Card Top: Contactless & Brand */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-[#8199AE] rotate-90" />
              <span className="text-xs font-mono tracking-widest text-[#E7EDF2] uppercase font-bold">
                RESERVE POOL
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#8199AE]" />
              <span className="text-xs font-mono font-bold tracking-wider text-[#8199AE] uppercase truncate max-w-[150px]">
                {tripName}
              </span>
            </div>
          </div>

          {/* Back Card Mid: Card Number & Escrow Rail */}
          <div className="relative z-10 my-1">
            <div className="text-[11px] font-mono text-[#8199AE] mb-1">
              ESCROW BUFFER • VISA DIRECT
            </div>
            <div className="font-mono text-sm sm:text-base tracking-[0.25em] text-[#E7EDF2] font-bold">
              1253 •••• •••• 3090
            </div>
          </div>

          {/* Back Card Bottom: Expiry, CVV & Activation Prompt */}
          <div className="flex items-center justify-between relative z-10 text-xs font-mono text-[#8199AE] pt-2 border-t border-[#33475A]">
            <div>
              <span className="text-[10px] uppercase tracking-wider block text-[#4E6A83] font-semibold">Valid Thru</span>
              <span className="text-[#B7C6D3] font-bold text-xs sm:text-sm">09/28</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider block text-[#4E6A83] font-semibold">Security</span>
              <span className="text-[#B7C6D3] font-bold text-xs sm:text-sm">Verified</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider block text-[#4E6A83] font-semibold">Status</span>
              <span className="text-[#E7EDF2] font-bold text-xs sm:text-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E7EDF2] animate-pulse" />
                Active
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
