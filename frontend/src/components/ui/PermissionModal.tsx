'use client';

/**
 * PermissionModal — Transparent permission request system.
 * Appears before any sensitive action (file read, model download, OS access).
 * Explains clearly WHY the permission is needed and what happens with the data.
 */

import React from 'react';

export type PermissionType = 'file_read' | 'model_download' | 'notification' | 'file_write';

interface PermissionModalProps {
  type: PermissionType;
  detail: string;          // filename, model name, etc.
  extraInfo?: string;      // e.g. file size, RAM cost
  onAllow: () => void;
  onDeny: () => void;
}

const PERMISSION_CONFIG: Record<
  PermissionType,
  { icon: string; title: string; accentColor: string; explanation: string; allowLabel: string }
> = {
  file_read: {
    icon: '📂',
    title: 'Read File Access',
    accentColor: '#fbbf24',
    explanation: 'NeuralFlow needs to read this file so the AI can process its content. Your file never leaves your device — it is only passed to the local AI model running on your Mac.',
    allowLabel: 'Allow Read Access',
  },
  file_write: {
    icon: '💾',
    title: 'Write File Access',
    accentColor: '#c084fc',
    explanation: 'NeuralFlow wants to save the AI output to this location on your disk. Only the AI-generated result will be written — no other data is touched.',
    allowLabel: 'Allow Save',
  },
  model_download: {
    icon: '⬇️',
    title: 'Download AI Model',
    accentColor: '#22d3ee',
    explanation: 'This AI model is not yet on your device. NeuralFlow will use Ollama (already installed) to download it directly from the internet. The model will be stored locally and never sent anywhere else. After downloading, it runs 100% offline.',
    allowLabel: 'Download Model',
  },
  notification: {
    icon: '🔔',
    title: 'Send Notification',
    accentColor: '#34d399',
    explanation: "NeuralFlow would like to send you a macOS notification when your workflow finishes, so you don't have to wait and watch the screen. No personal data is included in the notification.",
    allowLabel: 'Allow Notifications',
  },
};

export default function PermissionModal({
  type,
  detail,
  extraInfo,
  onAllow,
  onDeny,
}: PermissionModalProps) {
  const cfg = PERMISSION_CONFIG[type];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center permission-backdrop animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.65)' }}
    >
      <div
        className="relative w-[420px] rounded-2xl overflow-hidden animate-slide-up"
        style={{
          background: 'var(--nf-bg-modal)',
          border: `1px solid ${cfg.accentColor}30`,
          boxShadow: `0 0 60px -10px ${cfg.accentColor}30, 0 24px 64px -12px rgba(0,0,0,0.7)`,
        }}
      >
        {/* Top accent strip */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${cfg.accentColor}, ${cfg.accentColor}44)` }} />

        {/* Content */}
        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: `${cfg.accentColor}15`, border: `1px solid ${cfg.accentColor}25` }}
            >
              {cfg.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-0.5" style={{ color: cfg.accentColor }}>
                Permission Requested
              </p>
              <h2 className="text-base font-bold" style={{ color: 'var(--nf-text-primary)' }}>
                {cfg.title}
              </h2>
            </div>
          </div>

          {/* What / Where */}
          <div
            className="rounded-xl px-4 py-3 mb-4"
            style={{ background: `${cfg.accentColor}08`, border: `1px solid ${cfg.accentColor}18` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: cfg.accentColor }}>
              {type === 'model_download' ? 'Model' : 'File'}
            </p>
            <p className="text-sm font-semibold break-all" style={{ color: 'var(--nf-text-primary)' }}>{detail}</p>
            {extraInfo && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--nf-text-muted)' }}>{extraInfo}</p>
            )}
          </div>

          {/* Explanation */}
          <p className="text-[12px] leading-relaxed mb-6" style={{ color: 'var(--nf-text-secondary)' }}>
            {cfg.explanation}
          </p>

          {/* Privacy note */}
          <div className="flex items-start gap-2 mb-6 p-3 rounded-lg" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
            <span className="text-xs mt-0.5">🔒</span>
            <p className="text-[11px]" style={{ color: 'var(--nf-accent-emerald)' }}>
              Everything stays on your device. NeuralFlow never uploads your data to any server.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onDeny}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-80"
              style={{
                background: 'var(--nf-bg-input)',
                border: '1px solid var(--nf-border)',
                color: 'var(--nf-text-muted)',
              }}
            >
              Deny
            </button>
            <button
              onClick={onAllow}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                background: cfg.accentColor,
                color: '#000',
                boxShadow: `0 4px 20px -4px ${cfg.accentColor}60`,
              }}
            >
              {cfg.allowLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
