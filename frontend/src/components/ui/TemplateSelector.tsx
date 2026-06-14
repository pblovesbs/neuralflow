"use client";
import React from 'react';
import { Mail, Folder, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { useWorkflowStore, WorkflowTemplate } from '../../store/workflowStore';

const TEMPLATES: (WorkflowTemplate & { id: string, icon: React.ReactNode, title: string, desc: string })[] = [
  {
    id: 't1',
    icon: <Mail className="text-orange-400" size={24} />,
    title: 'Summarize Daily Emails',
    desc: 'Reads your inbox and generates a clean summary of key points.',
    triggerType: 'email',
    automationName: 'Daily Inbox Summary',
    aiTasks: [{
      role: 'Executive Assistant',
      task: 'Summarize the key points, action items, and important updates from these emails.',
      format: 'Markdown bullet points',
      model: 'qwen2.5:0.5b',
      delaySeconds: 0
    }],
    targetPathHint: '~/Desktop/Email_Summaries'
  },
  {
    id: 't2',
    icon: <Folder className="text-cyan-400" size={24} />,
    title: 'Watch Folder & Extract Info',
    desc: 'Processes new files to extract dates, names, and amounts.',
    triggerType: 'folder',
    automationName: 'Invoice Data Extractor',
    aiTasks: [{
      role: 'Data Entry Clerk',
      task: 'Extract invoice numbers, dates, company names, and total amounts.',
      format: 'JSON list of objects',
      model: 'qwen2.5:0.5b',
      delaySeconds: 0
    }],
    targetPathHint: '~/Documents/Extracted_Data'
  },
  {
    id: 't3',
    icon: <FileText className="text-purple-400" size={24} />,
    title: 'File Content Analyzer',
    desc: 'Analyzes a single document for insights and sentiment.',
    triggerType: 'file',
    automationName: 'Document Analyzer',
    aiTasks: [{
      role: 'Data Analyst',
      task: 'Analyze the tone, main arguments, and overall sentiment of this text.',
      format: 'Brief analytical report',
      model: 'qwen2.5:0.5b',
      delaySeconds: 0
    }],
    targetPathHint: '~/Desktop/Analysis_Reports'
  }
];

export function TemplateSelector({ onStartScratch }: { onStartScratch: () => void }) {
  const { loadTemplate } = useWorkflowStore();

  return (
    <div className="max-w-5xl mx-auto py-12 px-6 animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-[var(--nf-accent-cyan)]/20 rounded-2xl mb-4">
          <Sparkles className="text-[var(--nf-accent-cyan)]" size={32} />
        </div>
        <h2 className="text-3xl font-bold text-[var(--nf-text-primary)] mb-3">What would you like to automate?</h2>
        <p className="text-[var(--nf-text-secondary)]">Choose a starting template, or build your own pipeline from scratch.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => loadTemplate(t)}
            className="text-left nf-card p-6 rounded-2xl flex flex-col group relative overflow-hidden border-2 border-[var(--nf-border)] hover:border-[var(--nf-accent-cyan)]/50 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
              <ChevronRight className="text-[var(--nf-accent-cyan)]" />
            </div>
            <div className="p-3 bg-[var(--nf-bg-surface-hover)] rounded-xl w-fit mb-4 border border-[var(--nf-border)] group-hover:border-[var(--nf-accent-cyan)]/30 transition-colors">
              {t.icon}
            </div>
            <h3 className="font-bold text-[var(--nf-text-primary)] text-lg mb-2">{t.title}</h3>
            <p className="text-sm text-[var(--nf-text-muted)] flex-1">{t.desc}</p>
            
            <div className="mt-6 flex items-center text-[11px] font-bold text-[var(--nf-accent-cyan)] opacity-80 group-hover:opacity-100 transition-opacity">
              USE TEMPLATE
            </div>
          </button>
        ))}

        {/* Start from Scratch Card */}
        <button
          onClick={onStartScratch}
          className="text-left nf-card p-6 rounded-2xl flex flex-col group relative overflow-hidden border-2 border-[var(--nf-border)] hover:border-[var(--nf-accent-purple)]/50 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 border-dashed bg-[var(--nf-bg-surface)] hover:bg-[var(--nf-bg-surface-hover)]"
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
            <ChevronRight className="text-[var(--nf-accent-purple)]" />
          </div>
          <div className="p-3 bg-[var(--nf-bg-surface-hover)] rounded-xl w-fit mb-4 border border-[var(--nf-border)] group-hover:border-[var(--nf-accent-purple)]/30 transition-colors flex items-center justify-center">
            <div className="w-6 h-6 flex items-center justify-center">
              <span className="text-2xl text-[var(--nf-accent-purple)]">+</span>
            </div>
          </div>
          <h3 className="font-bold text-[var(--nf-text-primary)] text-lg mb-2">Start from Scratch</h3>
          <p className="text-sm text-[var(--nf-text-muted)] flex-1">I know what I&apos;m doing. Build a custom automation pipeline from the ground up.</p>
          
          <div className="mt-6 flex items-center text-[11px] font-bold text-[var(--nf-accent-purple)] opacity-80 group-hover:opacity-100 transition-opacity">
            CREATE BLANK
          </div>
        </button>
      </div>
    </div>
  );
}
