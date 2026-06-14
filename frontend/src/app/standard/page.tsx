"use client";
import React, { useEffect, useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import useThemeStore from '../../store/themeStore';
import { TriggerConfiguration } from '../../components/ui/TriggerConfiguration';
import { AgentTaskBuilder } from '../../components/ui/AgentTaskBuilder';
import { OutputConfiguration } from '../../components/ui/OutputConfiguration';
import { ExecutionTelemetry } from '../../components/ui/ExecutionTelemetry';
import { ScheduleConfiguration } from '../../components/ui/ScheduleConfiguration';
import { TemplateSelector } from '../../components/ui/TemplateSelector';
import { StepProgress } from '../../components/ui/StepProgress';
import { BackendFailsafe } from '../../components/ui/BackendFailsafe';
import { Sparkles, Sun, Moon, Save, ChevronDown, Rocket, Trash2, Check, ArrowLeft, ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function StandardPage() {
  const { 
    triggerType,
    automationName,
    setAutomationName,
    saveCurrentAutomation,
    lastSavedAt,
    savedAutomations,
    loadAutomation,
    deleteAutomation,
    reset
  } = useWorkflowStore();
  
  const router = useRouter();
  const { mode: theme, toggleTheme } = useThemeStore();
  
  const [showTemplates, setShowTemplates] = useState(!triggerType);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [showAutomationsMenu, setShowAutomationsMenu] = useState(false);

  const handleManualSave = () => {
    if (!automationName.trim()) {
      alert("Please enter a name for the automation before saving.");
      return;
    }
    saveCurrentAutomation();
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);
  };

  // The persist middleware already auto-saves. The saveCurrentAutomation is for the history list.

  useEffect(() => {
    if (triggerType) setShowTemplates(false);
  }, [triggerType]);

  const handleStartScratch = () => {
    setShowTemplates(false);
    reset();
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-[var(--nf-bg-primary)] text-[var(--nf-text-primary)] transition-colors duration-300 ${theme}`}>
      
      {/* Top Navigation */}
      <header className="h-14 border-b border-[var(--nf-border)] bg-[var(--nf-bg-surface)] flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          
          {/* Back/Forward Navigation */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => reset()}
              className="p-1.5 rounded-lg text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] hover:bg-[var(--nf-bg-input)] transition-colors"
              title="Go Back"
            >
              <ArrowLeft size={18} />
            </button>
            <button 
              onClick={() => router.forward()}
              className="p-1.5 rounded-lg text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] hover:bg-[var(--nf-bg-input)] transition-colors"
              title="Go Forward"
            >
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="h-6 w-px bg-[var(--nf-border)] mx-1"></div>

          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[var(--nf-text-primary)] font-bold text-lg hover:opacity-80 transition-opacity"
            title="Exit to Home"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--nf-accent-cyan)] to-[var(--nf-accent-purple)] flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            NeuralFlow
          </button>

          <div className="h-6 w-px bg-[var(--nf-border)] mx-2"></div>

          {/* Automation Naming */}
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              value={automationName}
              onChange={(e) => setAutomationName(e.target.value)}
              placeholder="Untitled Automation"
              className="bg-transparent border-none outline-none font-semibold text-[var(--nf-text-primary)] placeholder-[var(--nf-text-muted)] hover:bg-[var(--nf-bg-input)] px-2 py-1 rounded transition-colors min-w-[200px]"
            />
            <button
              onClick={handleManualSave}
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--nf-bg-primary)] bg-[var(--nf-accent-cyan)] hover:bg-[var(--nf-accent-cyan)]/90 rounded-lg transition-colors shadow-[0_0_10px_rgba(8,145,178,0.3)]"
            >
              <Save size={14} /> Save
            </button>
            {saveIndicator && (
              <span className="text-xs text-[var(--nf-accent-emerald)] flex items-center gap-1 animate-fade-in ml-2">
                <Check size={12} /> Saved!
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          
          {/* Saved Automations Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowAutomationsMenu(!showAutomationsMenu)}
              className="flex items-center gap-2 text-sm font-medium text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] bg-[var(--nf-bg-input)] px-3 py-1.5 rounded-lg border border-[var(--nf-border)] transition-colors"
            >
              My Automations <ChevronDown size={14} />
            </button>
            {showAutomationsMenu && (
              <div className="absolute right-0 mt-2 w-64 glass border border-[var(--nf-border)] rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-[var(--nf-border)] mb-2">
                  <span className="text-xs font-bold text-[var(--nf-text-muted)] uppercase tracking-wider">Saved Configurations</span>
                </div>
                {savedAutomations.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[var(--nf-text-muted)]">No saved automations yet.</div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {savedAutomations.map(a => (
                      <div key={a.id} className="flex justify-between items-center px-4 hover:bg-[var(--nf-bg-surface-hover)] group">
                        <button 
                          onClick={() => { loadAutomation(a.id); setShowAutomationsMenu(false); }}
                          className="flex-1 text-left py-2 text-sm text-[var(--nf-text-primary)] transition-colors flex justify-between items-center"
                        >
                          <span className="truncate">{a.name}</span>
                          <span className="text-[10px] text-[var(--nf-text-muted)] shrink-0 mr-2 group-hover:opacity-0 transition-opacity">{new Date(a.savedAt).toLocaleDateString()}</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteAutomation(a.id); }}
                          className="text-[var(--nf-accent-red)] opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[var(--nf-accent-red)]/10 rounded-md"
                          title="Delete Automation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-[var(--nf-border)] mt-2 pt-2 px-2">
                  <button onClick={() => { reset(); setShowAutomationsMenu(false); setShowTemplates(true); }} className="w-full text-left px-2 py-1.5 text-sm text-[var(--nf-accent-cyan)] hover:bg-[var(--nf-accent-cyan)]/10 rounded font-medium transition-colors">
                    + Create New
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-[var(--nf-border)] mx-1"></div>

          <button 
            onClick={toggleTheme}
            className="p-2 text-[var(--nf-text-muted)] hover:text-[var(--nf-text-primary)] bg-[var(--nf-bg-input)] hover:bg-[var(--nf-bg-surface-hover)] rounded-lg transition-colors border border-[var(--nf-border)]"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="h-6 w-px bg-[var(--nf-border)] mx-1"></div>

          <BackendFailsafe />

        </div>
      </header>

      {showTemplates ? (
        <div className="flex-1 overflow-y-auto">
          <TemplateSelector onStartScratch={handleStartScratch} />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 overflow-y-auto px-10 py-8 relative">
            <div className="max-w-3xl mx-auto">
              
              <StepProgress />

              <div className="relative border-l-2 border-[var(--nf-border)] ml-4 pl-10 pb-8">
                <TriggerConfiguration />
                <AgentTaskBuilder />
                <ScheduleConfiguration />
                <OutputConfiguration />
              </div>

              {/* Builder Mode link safely at the bottom */}
              <div className="mt-8 mb-16 text-center border-t border-[var(--nf-border)] pt-8">
                <Link 
                  href="/builder" 
                  className="text-sm font-medium text-[var(--nf-text-muted)] hover:text-[var(--nf-text-primary)] transition-colors group relative inline-block"
                >
                  Need more control? Try Builder Mode →
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[var(--nf-bg-modal)] border border-[var(--nf-border)] rounded-lg shadow-xl text-xs text-left opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Builder Mode gives you a visual canvas to drag-and-drop nodes. Best for advanced users who want full control over their pipeline architecture.
                  </div>
                </Link>
              </div>

            </div>
          </div>
          <div className="w-[380px] shrink-0 border-l border-[var(--nf-border)] hidden lg:block z-10">
            <ExecutionTelemetry />
          </div>
        </div>
      )}
    </div>
  );
}
