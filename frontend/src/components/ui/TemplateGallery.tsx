'use client';

/**
 * TemplateGallery — Empty-canvas overlay presenting pre-built workflow templates.
 * Shown when nodes.length === 0. Calls loadTemplate() on card click.
 */

import React from 'react';
import useFlowStore from '@/store/flowStore';

const TEMPLATES = [
  {
    id: 'summarize',
    icon: '📄',
    title: 'Summarize a Document',
    description: 'Drop in any file and get a clean, concise summary in seconds.',
    color: '#06b6d4',
    steps: ['📂 Source Data', '🧠 AI Brain', '💾 Destination'],
  },
  {
    id: 'action_items',
    icon: '✅',
    title: 'Isolate Action Items',
    description: 'Extract every task, follow-up, and next step from your notes or documents.',
    color: '#a855f7',
    steps: ['📂 Source Data', '🧠 AI Brain', '💾 Destination'],
  },
  {
    id: 'scratch',
    icon: '✨',
    title: 'Start From Scratch',
    description: 'Build your own custom AI pipeline by dragging nodes from the sidebar.',
    color: '#facc15',
    steps: [],
  },
];

export default function TemplateGallery() {
  // const loadTemplate = useFlowStore((s) => s.loadTemplate);
  const loadTemplate = (id: string) => {
    console.warn('loadTemplate not implemented for Builder Mode yet', id);
  };
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #a855f7)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nf-text-primary)' }}>
            NeuralFlow
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--nf-text-secondary)' }}>
          What do you want to build today?
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--nf-text-ghost)' }}>
          Choose a starting point, or build your own from scratch.
        </p>
      </div>

      {/* Template cards */}
      <div className="flex gap-5 flex-wrap justify-center px-8">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => loadTemplate(template.id)}
            className="group relative flex flex-col items-start text-left w-64 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid rgba(255,255,255,0.08)`,
              backdropFilter: 'blur(12px)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = `${template.color}50`;
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px -10px ${template.color}30`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLElement).style.boxShadow = '';
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
              style={{ background: `${template.color}15`, boxShadow: `0 0 20px -4px ${template.color}30` }}
            >
              {template.icon}
            </div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--nf-text-primary)' }}>
              {template.title}
            </h3>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--nf-text-dim)' }}>
              {template.description}
            </p>
            {template.steps.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {template.steps.map((step, i) => (
                  <React.Fragment key={step}>
                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: `${template.color}15`, color: template.color }}>
                      {step}
                    </span>
                    {i < template.steps.length - 1 && (
                      <span style={{ color: 'var(--nf-text-ghost)', fontSize: '8px' }}>→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: template.color }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
