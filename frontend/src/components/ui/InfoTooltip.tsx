import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  description: React.ReactNode;
}

export default function InfoTooltip({ title, description }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className="text-neutral-500 hover:text-cyan-400 transition-colors bg-white/5 hover:bg-cyan-500/10 rounded-full p-1"
        aria-label="More info"
      >
        <HelpCircle size={14} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 md:left-1/2 md:-translate-x-1/2 mt-2 w-64 p-4 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 animate-fade-in"
             onClick={(e) => e.stopPropagation()}
             style={{ backdropFilter: 'blur(10px)' }}>
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{title}</h4>
            <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <div className="text-[11px] text-neutral-300 space-y-2 leading-relaxed">
            {description}
          </div>
        </div>
      )}
    </div>
  );
}
