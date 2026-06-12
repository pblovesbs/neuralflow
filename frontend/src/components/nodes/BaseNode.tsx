'use client';

/**
 * BaseNode v2 — Premium card with gradient header bar, type badge, depth shadows.
 * Width increased to 340px. Better spacing throughout.
 */

import React from 'react';

interface BaseNodeProps {
  children: React.ReactNode;
  selected?: boolean;
  accentColor: string;       // tailwind class name (unused now, kept for compat)
  accentRaw: string;         // actual hex/rgba value
  glowRaw: string;           // rgba glow value
  gradientVar: string;       // CSS var name for gradient
  icon: React.ReactNode;
  label: React.ReactNode;
  nodeType: string;
  badge?: string;            // optional small pill badge text
}

export default function BaseNode({
  children,
  selected = false,
  accentRaw,
  glowRaw,
  gradientVar,
  icon,
  label,
  nodeType,
  badge,
}: BaseNodeProps) {
  return (
    <div
      className={`base-node relative min-w-[400px] rounded-2xl overflow-hidden transition-all duration-300 ease-out ${
        selected ? 'scale-[1.015] z-10' : 'hover:scale-[1.005]'
      }`}
      style={{
        background: 'var(--nf-node-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${selected ? accentRaw : 'var(--nf-border)'}`,
        boxShadow: selected
          ? `var(--nf-node-shadow-selected)`
          : 'var(--nf-node-shadow)',
      }}
    >
      {/* Subtle gradient overlay in top portion based on node type */}
      <div
        className="absolute inset-x-0 top-0 h-20 pointer-events-none"
        style={{ background: `var(${gradientVar})`, opacity: 0.6 }}
      />

      {/* Header bar */}
      <div
        className="relative flex items-center gap-2.5 px-4 py-3 z-10"
        style={{
          background: 'var(--nf-node-header)',
          borderBottom: `1px solid ${selected ? `${accentRaw}40` : 'var(--nf-border)'}`,
        }}
      >
        {/* Accent left strip */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
          style={{ background: accentRaw, boxShadow: `2px 0 12px ${glowRaw}` }}
        />

        {/* Icon */}
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg text-sm shrink-0 ml-2"
          style={{ background: `${accentRaw}20`, boxShadow: `0 0 12px ${glowRaw}` }}
        >
          {icon}
        </div>

        {/* Type label */}
        <div className="flex flex-col min-w-0">
          <span
            className="node-header-text text-[13px] tracking-[0.1em] uppercase leading-none"
            style={{ color: accentRaw, textShadow: `0 0 12px ${glowRaw}` }}
          >
            {nodeType}
          </span>
          <span
            className="text-[11px] font-semibold mt-0.5 truncate"
            style={{ color: 'var(--nf-text-secondary)' }}
          >
            {label}
          </span>
        </div>

        {/* Badge / Active indicator */}
        <div className="ml-auto flex items-center gap-2">
          {badge && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: `${accentRaw}18`, color: accentRaw }}
            >
              {badge}
            </span>
          )}
          {selected && (
            <span className="flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-60"
                style={{ background: accentRaw }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: accentRaw }}
              />
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative p-4 space-y-3 z-10">
        {children}
      </div>
    </div>
  );
}
