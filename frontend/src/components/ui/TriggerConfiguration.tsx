"use client";
import React from 'react';
import { Mail, Folder, FileText, KeyRound, ShieldCheck, Check } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { useValidation } from '../../hooks/useValidation';
import { HelpTooltip } from './HelpTooltip';

export function TriggerConfiguration() {
  const { 
    step, 
    setStep, 
    triggerType, 
    setTriggerType,
    email,
    setEmail,
    appPassword,
    setAppPassword,
    itemCount,
    setItemCount,
    sourcePath,
    setSourcePath,
    nodeStatuses
  } = useWorkflowStore();
  
  const { errors } = useValidation();
  const stepErrors = errors.filter(e => e.step === 1);
  const getFieldError = (field: string) => stepErrors.find(e => e.field === field);

  const status = nodeStatuses['trigger_1'] || 'idle';
  const isActive = step === 1;

  const pickSystemPath = async (type: 'folder' | 'save' | 'file') => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const endpoint = type === 'file' ? '/api/system/file-picker' : type === 'folder' ? '/api/system/folder-picker' : '/api/system/save-file-picker';
      const res = await fetch(`${backendUrl}${endpoint}`);
      const data = await res.json();
      if (data.path) setSourcePath(data.path);
    } catch {
      alert("Failed to open native file picker.");
    }
  };

  // Summary View
  if (!isActive && triggerType) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-[var(--nf-border)] bg-transparent opacity-80 hover:opacity-100 transition-opacity flex items-center justify-between group">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-[var(--nf-bg-surface)] border border-[var(--nf-border)] flex items-center justify-center text-[var(--nf-text-muted)]">
            <Check size={14} className="text-[var(--nf-accent-cyan)]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--nf-text-muted)] uppercase tracking-wider">Step 1: Source</h4>
            <p className="text-sm font-semibold text-[var(--nf-text-primary)] flex items-center gap-2">
              {triggerType === 'email' ? <><Mail size={14}/> Email Inbox: {email || 'Not configured'}</> : 
               triggerType === 'folder' ? <><Folder size={14}/> Folder: {sourcePath || 'Not configured'}</> : 
               <><FileText size={14}/> File: {sourcePath || 'Not configured'}</>}
            </p>
          </div>
        </div>
        <button onClick={() => setStep(1)} className="px-3 py-1.5 text-xs font-bold text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] bg-[var(--nf-bg-input)] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          Edit
        </button>
      </div>
    );
  }

  // Active View
  return (
    <div className={`mb-12 p-6 rounded-2xl border transition-colors duration-300 relative bg-[var(--nf-bg-surface)] border-[var(--nf-accent-cyan)]/50 shadow-lg shadow-[var(--nf-accent-cyan)]/5`}>
      
      {/* Timeline Node */}
      <div className={`absolute -left-[53px] top-8 w-6 h-6 rounded-full border-4 border-[var(--nf-bg-primary)] z-10 transition-colors ${status === 'completed' ? 'bg-[var(--nf-accent-emerald)]' : status === 'running' ? 'bg-[var(--nf-accent-cyan)] animate-pulse' : status === 'error' ? 'bg-[var(--nf-accent-red)]' : 'bg-[var(--nf-text-muted)]'}`} />
      
      {/* Animated Path when running */}
      {status === 'running' && (
        <div className="absolute -left-[42px] top-14 w-[2px] h-[calc(100%+32px)] bg-[var(--nf-accent-cyan)]/50 animate-pulse" />
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-[var(--nf-text-primary)] flex items-center gap-3">
          1. Where is the data coming from?
        </h3>
        {status === 'completed' && <span className="text-[var(--nf-accent-emerald)] font-bold flex items-center gap-1 text-sm bg-[var(--nf-accent-emerald)]/10 px-3 py-1 rounded-full border border-[var(--nf-accent-emerald)]/20">✓ Completed</span>}
        {status === 'running' && <span className="text-[var(--nf-accent-cyan)] font-bold flex items-center gap-2 text-sm bg-[var(--nf-accent-cyan)]/10 px-3 py-1 rounded-full border border-[var(--nf-accent-cyan)]/20"><span className="w-4 h-4 border-2 border-[var(--nf-accent-cyan)] border-t-transparent rounded-full animate-spin"/> Processing</span>}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <button onClick={() => { setTriggerType('email'); }} className={`p-4 rounded-xl border transition-all ${triggerType === 'email' ? 'bg-[var(--nf-accent-cyan)]/20 border-[var(--nf-accent-cyan)] text-[var(--nf-accent-cyan)] shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-[var(--nf-bg-input)] border-[var(--nf-border)] text-[var(--nf-text-primary)] hover:bg-[var(--nf-bg-surface-hover)]'} flex flex-col items-center gap-2`}>
          <Mail size={24} /> Email Inbox
        </button>
        <button onClick={() => { setTriggerType('folder'); }} className={`p-4 rounded-xl border transition-all ${triggerType === 'folder' ? 'bg-[var(--nf-accent-cyan)]/20 border-[var(--nf-accent-cyan)] text-[var(--nf-accent-cyan)] shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-[var(--nf-bg-input)] border-[var(--nf-border)] text-[var(--nf-text-primary)] hover:bg-[var(--nf-bg-surface-hover)]'} flex flex-col items-center gap-2`}>
          <Folder size={24} /> Local Folder
        </button>
        <button onClick={() => { setTriggerType('file'); }} className={`p-4 rounded-xl border transition-all ${triggerType === 'file' ? 'bg-[var(--nf-accent-cyan)]/20 border-[var(--nf-accent-cyan)] text-[var(--nf-accent-cyan)] shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-[var(--nf-bg-input)] border-[var(--nf-border)] text-[var(--nf-text-primary)] hover:bg-[var(--nf-bg-surface-hover)]'} flex flex-col items-center gap-2`}>
          <FileText size={24} /> Single File
        </button>
      </div>
      
      {getFieldError('triggerType') && <p className="text-xs text-[var(--nf-accent-red)] mb-4">{getFieldError('triggerType')?.message}</p>}

      {triggerType === 'email' && (
        <div className="space-y-4 animate-fade-in relative mb-6">
          <div>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className={`w-full bg-[var(--nf-bg-input)] border ${getFieldError('email') ? 'border-[var(--nf-accent-red)]' : 'border-[var(--nf-border)]'} focus:border-[var(--nf-accent-cyan)]/50 rounded-lg p-3 text-[var(--nf-text-primary)] outline-none transition-colors`} 
            />
            {getFieldError('email') && <p className="text-xs text-[var(--nf-accent-red)] mt-1">{getFieldError('email')?.message}</p>}
          </div>
          
          <div>
            <div className="relative flex items-center">
              <input 
                type="password" 
                placeholder="App Password" 
                value={appPassword} 
                onChange={e => setAppPassword(e.target.value)} 
                className={`w-full bg-[var(--nf-bg-input)] border ${getFieldError('appPassword') ? 'border-[var(--nf-accent-red)]' : 'border-[var(--nf-border)]'} focus:border-[var(--nf-accent-cyan)]/50 rounded-lg p-3 text-[var(--nf-text-primary)] outline-none transition-colors pr-12`} 
              />
              <div className="absolute right-3">
                <HelpTooltip 
                  title="Google App Passwords"
                  content="To allow NeuralFlow to read your emails securely, you need to generate a one-time 'App Password'. Your standard Google password will not work."
                  steps={[
                    { icon: <ShieldCheck size={16}/>, text: "Enable 2-Step Verification", subtext: "Required for App Passwords." },
                    { icon: <KeyRound size={16}/>, text: "Generate Password", subtext: "Select 'Other', type 'NeuralFlow', and copy the 16-character code." }
                  ]}
                  link={{ url: "https://myaccount.google.com/apppasswords", text: "Create App Password" }}
                />
              </div>
            </div>
            {getFieldError('appPassword') && <p className="text-xs text-[var(--nf-accent-red)] mt-1">{getFieldError('appPassword')?.message}</p>}
          </div>

          <p className="text-xs text-[var(--nf-text-muted)]">IMAP settings automatically configured.</p>
        </div>
      )}

      {triggerType && (
        <div className="animate-fade-in mt-6 pt-6 border-t border-[var(--nf-border)] flex gap-4 items-center">
          <label className="text-sm text-[var(--nf-text-primary)] font-medium">
            {triggerType === 'email' ? 'Number of emails to read:' : triggerType === 'folder' ? 'Number of files to process:' : 'Number of items to read:'}
          </label>
          <select
            value={['1', '3', '5', '10', 'all'].includes(itemCount.toLowerCase()) ? itemCount.toLowerCase() : 'custom'}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setItemCount('15');
              } else {
                setItemCount(e.target.value);
              }
            }}
            className="bg-[var(--nf-bg-input)] border border-[var(--nf-border)] focus:border-[var(--nf-accent-cyan)]/50 rounded-lg p-2 text-[var(--nf-text-primary)] outline-none"
          >
            <option value="1">1 {triggerType === 'email' ? '(Oldest)' : ''}</option>
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="all">All (up to 50)</option>
            <option value="custom">Custom...</option>
          </select>
          
          {!['1', '3', '5', '10', 'all'].includes(itemCount.toLowerCase()) && (
            <input 
              type="number" 
              min="1"
              max="50"
              value={itemCount}
              onChange={(e) => setItemCount(e.target.value)}
              className="w-20 bg-[var(--nf-bg-input)] border border-[var(--nf-border)] focus:border-[var(--nf-accent-cyan)]/50 rounded-lg p-2 text-[var(--nf-text-primary)] outline-none"
              placeholder="Count"
            />
          )}
        </div>
      )}

      {(triggerType === 'folder' || triggerType === 'file') && (
         <div className="animate-fade-in mb-6">
           <div className="flex gap-2">
             <input 
               type="text" 
               placeholder={`Paste ${triggerType} path...`} 
               value={sourcePath} 
               onChange={e => setSourcePath(e.target.value)} 
               className={`flex-1 bg-[var(--nf-bg-input)] border ${getFieldError('sourcePath') ? 'border-[var(--nf-accent-red)]' : 'border-[var(--nf-border)]'} focus:border-[var(--nf-accent-cyan)]/50 rounded-lg p-3 text-[var(--nf-text-primary)] outline-none transition-colors`} 
             />
             <button onClick={() => pickSystemPath(triggerType as 'folder' | 'file')} className="px-4 bg-[var(--nf-accent-cyan)]/20 hover:bg-[var(--nf-accent-cyan)]/30 text-[var(--nf-accent-cyan)] border border-[var(--nf-accent-cyan)]/30 rounded-lg transition-colors">Browse</button>
           </div>
           {getFieldError('sourcePath') && <p className="text-xs text-[var(--nf-accent-red)] mt-1">{getFieldError('sourcePath')?.message}</p>}
         </div>
      )}

      {/* Next Button */}
      {triggerType && (
        <div className="flex justify-end pt-4 border-t border-[var(--nf-border)]">
          <button 
            onClick={() => setStep(2)}
            disabled={stepErrors.length > 0}
            className="px-6 py-2.5 bg-[var(--nf-accent-cyan)] hover:bg-[var(--nf-accent-cyan)]/80 text-[var(--nf-bg-primary)] font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Configure AI
          </button>
        </div>
      )}
    </div>
  );
}
