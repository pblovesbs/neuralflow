"use client";
import React from 'react';
import { useValidation } from '../../hooks/useValidation';
import { useWorkflowStore } from '../../store/workflowStore';
import { Check } from 'lucide-react';

export function StepProgress() {
  const { errors } = useValidation();
  const { step } = useWorkflowStore();

  const isStep1Complete = step > 1;
  const isStep2Complete = step > 2;
  const isStep3Complete = step > 3;
  const isStep4Complete = step > 4;

  const steps = [
    { num: 1, label: 'Source', complete: isStep1Complete, current: step === 1 },
    { num: 2, label: 'AI Tasks', complete: isStep2Complete, current: step === 2 },
    { num: 3, label: 'Schedule', complete: isStep3Complete, current: step === 3 },
    { num: 4, label: 'Output', complete: isStep4Complete, current: step >= 4 },
  ];

  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-10 mt-4 relative">
      {/* Background connecting line */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-[var(--nf-border)] z-0" />
      
      {/* Active connecting line */}
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--nf-accent-cyan)] z-0 transition-all duration-500 ease-out"
        style={{ width: `${(Math.max(1, step) - 1) * 33.33}%` }}
      />

      {steps.map((s, idx) => (
        <div key={s.num} className="relative z-10 flex flex-col items-center gap-2 bg-[var(--nf-bg-primary)] px-2">
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
              ${s.complete 
                ? 'bg-[var(--nf-accent-cyan)] text-[var(--nf-bg-primary)] shadow-[0_0_15px_rgba(8,145,178,0.4)]' 
                : s.current 
                  ? 'bg-[var(--nf-bg-surface)] border-2 border-[var(--nf-accent-cyan)] text-[var(--nf-accent-cyan)]' 
                  : 'bg-[var(--nf-bg-surface)] border-2 border-[var(--nf-border)] text-[var(--nf-text-muted)]'
              }`}
          >
            {s.complete ? <Check size={16} strokeWidth={3} /> : s.num}
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-bold ${s.current || s.complete ? 'text-[var(--nf-text-primary)]' : 'text-[var(--nf-text-muted)]'}`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
