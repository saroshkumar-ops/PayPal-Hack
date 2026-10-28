import React from 'react';
import { Clock, CheckCircle2, Bot, LayoutDashboard, Terminal } from 'lucide-react';

interface NavbarProps {
  activeTab: 'simulator' | 'dashboard';
  setActiveTab: (tab: 'simulator' | 'dashboard') => void;
  hoursElapsed: number;
  isBackendConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hoursElapsed,
  isBackendConnected,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0d121f]/90 backdrop-blur-md border-b border-gray-800 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-xl font-bold">
            🤠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white m-0 p-0 leading-tight">
                TripSheriff <span className="text-amber-400">AI</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                PayPal AI Hackathon 2026
              </span>
            </div>
            <p className="text-xs text-gray-400 m-0 p-0 hidden sm:block">
              Autonomous Travel Treasury & Debt Enforcement Agent
            </p>
          </div>
        </div>

        {/* Center Tab Navigation */}
        <div className="flex items-center bg-gray-900/80 p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Judge Web Simulator
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            AG Grid Organizer Portal
          </button>
        </div>

        {/* Right Status Badges */}
        <div className="flex items-center gap-3">
          {/* Simulated Time Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800/60 border border-gray-700/60 rounded-lg text-xs text-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Trip Clock: <strong>+{hoursElapsed}h</strong></span>
          </div>

          {/* Backend Status */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800/60 border border-gray-700/60 rounded-lg text-xs">
            {isBackendConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Java :8080 Live</span>
              </>
            ) : (
              <>
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300 font-medium">Autonomous Mode</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
