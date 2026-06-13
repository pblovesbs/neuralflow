"use client";
import React, { useState, useEffect } from 'react';
import { Clock, Bell, CalendarClock } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import cronstrue from 'cronstrue';
import { HelpTooltip } from './HelpTooltip';

const PRESETS = [
  { id: 'every5min', label: '⚡ Every 5 min', expr: '*/5 * * * *' },
  { id: 'hourly', label: '🕐 Every hour', expr: '0 * * * *' },
  { id: 'daily', label: '📅 Every day', expr: '0 9 * * *' },
  { id: 'weekly', label: '📆 Every week', expr: '0 9 * * 1' },
  { id: 'weekdays', label: '💼 Weekdays', expr: '0 9 * * 1-5' },
  { id: 'custom', label: '✏️ Custom', expr: '' }
] as const;

export function ScheduleConfiguration() {
  const { 
    step, 
    setStep,
    scheduleEnabled, 
    setScheduleEnabled, 
    schedulePreset, 
    setSchedulePreset,
    cronExpression,
    setCronExpression,
    notifyOnRun,
    setNotifyOnRun,
    notifyEmail,
    setNotifyEmail,
    triggerType,
    email
  } = useWorkflowStore();

  const [humanCron, setHumanCron] = useState('');

  // Auto-fill notify email if trigger is email
  useEffect(() => {
    if (triggerType === 'email' && email && !notifyEmail) {
      setNotifyEmail(email);
    }
  }, [triggerType, email, notifyEmail, setNotifyEmail]);

  useEffect(() => {
    if (cronExpression) {
      try {
        setHumanCron(cronstrue.toString(cronExpression, { throwExceptionOnParseError: true }));
      } catch {
        setHumanCron('Invalid cron expression');
      }
    } else {
      setHumanCron('');
    }
  }, [cronExpression]);

  if (step < 3) return null;

  const isActive = step === 3;

  if (!isActive) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-[var(--nf-border)] bg-transparent opacity-80 hover:opacity-100 transition-opacity flex items-center justify-between group">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-[var(--nf-bg-surface)] border border-[var(--nf-border)] flex items-center justify-center text-[var(--nf-text-muted)]">
            <CalendarClock size={14} className="text-[var(--nf-accent-purple)]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--nf-text-muted)] uppercase tracking-wider">Step 3: Schedule</h4>
            <p className="text-sm font-semibold text-[var(--nf-text-primary)]">
              {scheduleEnabled ? `Scheduled (${schedulePreset})` : 'Run Once Manually'}
            </p>
          </div>
        </div>
        <button onClick={() => setStep(3)} className="px-3 py-1.5 text-xs font-bold text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] bg-[var(--nf-bg-input)] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className={`mb-12 p-6 rounded-2xl border transition-colors duration-300 relative bg-[var(--nf-bg-surface)] border-[var(--nf-accent-purple)]/50 shadow-lg shadow-[var(--nf-accent-purple)]/5`}>
      
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-[var(--nf-text-primary)] flex items-center gap-3">
          <CalendarClock className={scheduleEnabled ? 'text-[var(--nf-accent-purple)]' : 'text-[var(--nf-text-muted)]'} />
          3. How often should this run?
        </h3>
        
        {/* Toggle Switch */}
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={scheduleEnabled} 
              onChange={e => setScheduleEnabled(e.target.checked)} 
            />
            <div className={`block w-14 h-8 rounded-full transition-colors ${scheduleEnabled ? 'bg-[var(--nf-accent-purple)]' : 'bg-[var(--nf-border-hover)]'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${scheduleEnabled ? 'transform translate-x-6' : ''}`}></div>
          </div>
          <div className="ml-3 font-medium text-sm text-[var(--nf-text-primary)]">
            {scheduleEnabled ? 'Run on a schedule' : 'Run once manually'}
          </div>
        </label>
      </div>

      {scheduleEnabled && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <label className="nf-label mb-3">Schedule Presets</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSchedulePreset(p.id);
                    if (p.expr) setCronExpression(p.expr);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                    schedulePreset === p.id 
                      ? 'bg-[var(--nf-accent-purple)]/20 border-[var(--nf-accent-purple)] text-[var(--nf-accent-purple)]' 
                      : 'bg-[var(--nf-bg-input)] border-[var(--nf-border)] text-[var(--nf-text-secondary)] hover:bg-[var(--nf-bg-surface-hover)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {schedulePreset === 'custom' && (
            <div className="animate-fade-in">
              <label className="nf-label flex items-center gap-2">
                Cron Expression
                <HelpTooltip 
                  title="Cron Syntax" 
                  content="Cron is a standard way to express schedules using 5 fields: Minute, Hour, Day of Month, Month, Day of Week."
                  link={{ url: "https://crontab.guru", text: "Open crontab.guru helper" }}
                />
              </label>
              <input 
                type="text" 
                value={cronExpression}
                onChange={e => setCronExpression(e.target.value)}
                placeholder="* * * * *"
                className="nf-input font-mono text-lg tracking-widest bg-[var(--nf-bg-input)]"
              />
            </div>
          )}

          {humanCron && (
            <div className="p-3 bg-[var(--nf-accent-purple)]/10 border border-[var(--nf-accent-purple)]/20 rounded-lg flex items-center gap-2 text-[var(--nf-accent-purple)]">
              <Clock size={16} />
              <span className="text-sm font-medium">This automation will run <strong>{humanCron.toLowerCase()}</strong>.</span>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--nf-border)]">
            <label className="flex items-center cursor-pointer mb-3">
              <input 
                type="checkbox" 
                checked={notifyOnRun}
                onChange={e => setNotifyOnRun(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--nf-border)] text-[var(--nf-accent-purple)] focus:ring-[var(--nf-accent-purple)] bg-[var(--nf-bg-input)]"
              />
              <span className="ml-2 text-sm text-[var(--nf-text-primary)] flex items-center gap-2">
                <Bell size={16} className="text-[var(--nf-text-muted)]" />
                Notify me when this automation runs
              </span>
            </label>
            
            {notifyOnRun && (
              <div className="pl-6 animate-fade-in mb-6">
                <input 
                  type="email" 
                  value={notifyEmail}
                  onChange={e => setNotifyEmail(e.target.value)}
                  placeholder="Email address for notifications"
                  className="nf-input max-w-md bg-[var(--nf-bg-input)]"
                />
                <p className="text-xs text-[var(--nf-text-muted)] mt-1">We'll send a brief summary to this email after each run.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 mt-6 border-t border-[var(--nf-border)]">
        <button onClick={() => setStep(2)} className="px-4 py-2.5 text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] font-bold transition-colors">
          Back to AI
        </button>
        <button onClick={() => setStep(4)} className="px-6 py-2.5 bg-[var(--nf-accent-purple)] hover:bg-[var(--nf-accent-purple)]/80 text-[var(--nf-bg-primary)] font-bold rounded-lg transition-colors">
          Next: Set Output
        </button>
      </div>
    </div>
  );
}
