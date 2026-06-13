"use client";
import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  steps?: { icon: React.ReactNode; text: string; subtext?: string }[];
  content?: React.ReactNode;
  link?: { url: string; text: string };
}

export function HelpTooltip({ title, steps, content, link }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-[var(--nf-accent-cyan)] hover:text-[var(--nf-text-primary)] transition-colors p-1 rounded-full hover:bg-[var(--nf-bg-surface-hover)]"
        type="button"
        title="More info"
      >
        <HelpCircle size={16} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-72 p-4 top-full left-1/2 -translate-x-1/2 mt-2 glass rounded-xl shadow-2xl border-[var(--nf-border)] animate-fade-in text-left">
          <h4 className="font-bold text-[var(--nf-text-primary)] mb-2 text-sm">{title}</h4>
          
          {content && (
            <div className="text-xs text-[var(--nf-text-secondary)] mb-3">
              {content}
            </div>
          )}

          {steps && steps.length > 0 && (
            <div className="space-y-3 mb-3">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="text-[var(--nf-accent-cyan)] mt-0.5 shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--nf-text-primary)]">{step.text}</p>
                    {step.subtext && <p className="text-[10px] text-[var(--nf-text-muted)] mt-0.5">{step.subtext}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {link && (
            <a 
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center mt-3 text-xs font-bold text-[var(--nf-bg-primary)] bg-[var(--nf-accent-cyan)] hover:bg-[var(--nf-accent-cyan)]/80 py-2 rounded-lg transition-colors"
            >
              {link.text}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
