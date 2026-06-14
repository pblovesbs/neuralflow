"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Plus, ChevronDown, ChevronUp, GripVertical, Clock, Undo2 } from 'lucide-react';
import { useWorkflowStore, AiTask } from '../../store/workflowStore';
import { MODEL_TIERS } from '../nodes/AgentNode';
import { useValidation } from '../../hooks/useValidation';
import { HelpTooltip } from './HelpTooltip';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function findModel(id: string) {
  for (const tier of MODEL_TIERS) {
    const m = tier.models.find(m => m.id === id);
    if (m) return { ...m, tierName: tier.tier };
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TaskItem({ id, task, idx, updateAiTask, removeAiTask, canRemove, showDeletedToast, installedModels, requestInstall }: any) {
  const { nodeStatuses } = useWorkflowStore();
  const [showModelList, setShowModelList] = useState(false);
  const [showDelay, setShowDelay] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { errors } = useValidation();
  
  const status = nodeStatuses[`agent_${idx}`] || 'idle';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : (showModelList ? 40 : 10 - idx),
    opacity: isDragging ? 0.8 : 1,
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelList(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedModelMeta = task.model ? findModel(task.model) : null;
  const getFieldError = (field: string) => errors.find(e => e.step === 2 && e.field === field);

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`bg-[var(--nf-bg-surface)] border ${isDragging ? 'border-[var(--nf-accent-purple)] shadow-2xl scale-[1.02]' : 'border-[var(--nf-border)]'} p-4 rounded-xl mb-4 space-y-4 shadow-inner relative flex gap-3`}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="flex flex-col items-center justify-center text-[var(--nf-text-muted)] hover:text-[var(--nf-text-primary)] cursor-grab active:cursor-grabbing w-6"
      >
        <GripVertical size={20} />
      </div>

      <div className="flex-1 space-y-4 relative">
        {/* Timeline Node */}
        <div className={`absolute -left-[65px] top-2 w-6 h-6 rounded-full border-4 border-[var(--nf-bg-primary)] z-10 transition-colors ${status === 'completed' ? 'bg-[var(--nf-accent-emerald)]' : status === 'running' ? 'bg-[var(--nf-accent-purple)] animate-pulse' : status === 'error' ? 'bg-[var(--nf-accent-red)]' : 'bg-[var(--nf-border)]'}`} />
        
        {/* Animated Path when running */}
        {status === 'running' && (
          <div className="absolute -left-[54px] top-8 w-[2px] h-[calc(100%+16px)] bg-[var(--nf-accent-purple)]/50 animate-pulse" />
        )}

        <div className="flex justify-between items-center">
          <span className="font-bold text-[var(--nf-accent-purple)] flex items-center gap-2">
            <Bot size={18}/> AI Step {idx + 1}
          </span>
          <div className="flex items-center gap-3">
            {status === 'completed' && <span className="text-[var(--nf-accent-emerald)] font-bold flex items-center gap-1 text-xs bg-[var(--nf-accent-emerald)]/10 px-2 py-1 rounded-full border border-[var(--nf-accent-emerald)]/20">✓ Done</span>}
            {status === 'running' && <span className="text-[var(--nf-accent-purple)] font-bold flex items-center gap-1 text-xs bg-[var(--nf-accent-purple)]/10 px-2 py-1 rounded-full border border-[var(--nf-accent-purple)]/20"><span className="w-3 h-3 border border-[var(--nf-accent-purple)] border-t-transparent rounded-full animate-spin"/> Working</span>}
            {canRemove && (
              <button 
                onClick={() => {
                  removeAiTask(idx);
                  showDeletedToast();
                }} 
                className="text-[var(--nf-accent-red)] hover:text-[var(--nf-accent-red)]/80 text-xs font-medium"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <input type="text" placeholder="Role (e.g., Financial Analyst)" value={task.role} onChange={e => updateAiTask(idx, { role: e.target.value })} className="w-full bg-[var(--nf-bg-input)] border border-[var(--nf-border)] focus:border-[var(--nf-accent-purple)]/50 rounded-lg p-3 text-[var(--nf-text-primary)] outline-none transition-colors" />
        
        <div>
          <input type="text" placeholder="Task (e.g., Extract all dates and amounts)" value={task.task} onChange={e => updateAiTask(idx, { task: e.target.value })} className={`w-full bg-[var(--nf-bg-input)] border ${getFieldError('aiTasks') && !task.task.trim() ? 'border-[var(--nf-accent-red)]' : 'border-[var(--nf-border)]'} focus:border-[var(--nf-accent-purple)]/50 rounded-lg p-3 text-[var(--nf-text-primary)] outline-none transition-colors`} />
        </div>

        <input type="text" placeholder="Format (e.g., A clean JSON object)" value={task.format} onChange={e => updateAiTask(idx, { format: e.target.value })} className="w-full bg-[var(--nf-bg-input)] border border-[var(--nf-border)] focus:border-[var(--nf-accent-purple)]/50 rounded-lg p-3 text-[var(--nf-text-primary)] outline-none transition-colors" />
        
        {/* Custom LLM Selector */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-[var(--nf-text-muted)] uppercase tracking-wider">AI Model</span>
            <HelpTooltip 
              title="Choosing a Model"
              content="Larger models (8B+) are smarter but take more memory and time. Smaller models (0.5B-3B) are fast and great for simple extraction."
            />
          </div>
          <button
            onClick={() => setShowModelList(v => !v)}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-all bg-[var(--nf-bg-input)] border ${getFieldError(`aiTasks.${idx}.model`) ? 'border-[var(--nf-accent-red)]' : 'border-[var(--nf-border)]'} focus:border-[var(--nf-accent-purple)]/50`}
          >
            {selectedModelMeta ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-[var(--nf-accent-purple)]/20 text-[var(--nf-accent-purple)]">
                  {selectedModelMeta.params}
                </span>
                <span className="text-sm font-semibold truncate text-[var(--nf-text-primary)]">{selectedModelMeta.name}</span>
                <span className="text-xs shrink-0 text-[var(--nf-text-muted)]">{selectedModelMeta.ram}</span>
              </div>
            ) : (
              <span className="text-sm text-[var(--nf-text-secondary)]">Select an AI model...</span>
            )}
            {showModelList ? <ChevronUp size={16} className="text-[var(--nf-text-muted)]"/> : <ChevronDown size={16} className="text-[var(--nf-text-muted)]"/>}
          </button>

          {showModelList && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-xl overflow-y-auto animate-slide-up glass border border-[var(--nf-accent-purple)]/30 shadow-2xl" style={{ maxHeight: '320px' }}>
              {MODEL_TIERS.map(tier => (
                <div key={tier.tier}>
                  <div className="sticky top-0 px-3 py-2 bg-[var(--nf-bg-modal)] border-b border-[var(--nf-border)] z-10">
                    <p className="text-xs font-bold text-[var(--nf-text-muted)]">{tier.tier}</p>
                  </div>
                  {tier.models.map(model => {
                    const isCurrent = task.model === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => { 
                          if (!installedModels.includes(model.id)) {
                            requestInstall(model.id, idx);
                            setShowModelList(false);
                          } else {
                            updateAiTask(idx, { model: model.id }); 
                            setShowModelList(false); 
                          }
                        }}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-all hover:bg-[var(--nf-bg-surface-hover)] ${isCurrent ? 'bg-[var(--nf-accent-purple)]/10 border-l-2 border-[var(--nf-accent-purple)]' : 'border-l-2 border-transparent'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-sm font-semibold truncate ${isCurrent ? 'text-[var(--nf-accent-purple)]' : 'text-[var(--nf-text-primary)]'}`}>{model.name}</span>
                            {!installedModels.includes(model.id) && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-[var(--nf-text-muted)]/20 text-[var(--nf-text-muted)]" title="Not installed">↓ Pull</span>
                            )}
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-[var(--nf-accent-purple)]/20 text-[var(--nf-accent-purple)]">{model.badge}</span>
                          </div>
                          <p className="text-xs text-[var(--nf-text-secondary)]">{model.desc}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-mono font-semibold text-[var(--nf-text-secondary)]">{model.params}</p>
                          <p className="text-xs text-[var(--nf-text-muted)]">{model.ram}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-task timer */}
        <div className="border-t border-[var(--nf-border)] pt-3 mt-2">
          <button 
            onClick={() => setShowDelay(!showDelay)} 
            className="flex items-center gap-2 text-xs text-[var(--nf-text-muted)] hover:text-[var(--nf-text-primary)] transition-colors"
          >
            <Clock size={14} />
            {task.delaySeconds > 0 ? `Delay: ${task.delaySeconds}s before starting` : 'Add delay before this step'}
          </button>
          
          {showDelay && (
            <div className="mt-3 flex items-center gap-3 animate-fade-in">
              <input 
                type="range" 
                min="0" max="300" step="5"
                value={task.delaySeconds || 0}
                onChange={e => updateAiTask(idx, { delaySeconds: parseInt(e.target.value) })}
                className="flex-1 accent-[var(--nf-accent-purple)]"
              />
              <span className="text-sm font-mono text-[var(--nf-accent-purple)] min-w-[40px]">{task.delaySeconds || 0}s</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export function AgentTaskBuilder() {
  const { step, setStep, aiTasks, updateAiTask, addAiTask, removeAiTask, reorderAiTasks, undo, undoStack } = useWorkflowStore();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);
  
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [modelToInstall, setModelToInstall] = useState<{ modelId: string, taskIndex: number } | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    fetch(`${backendUrl}/api/models/installed`)
      .then(res => res.json())
      .then(data => {
        if (data.installed) setInstalledModels(data.installed);
      })
      .catch(() => {});
  }, [backendUrl]);

  const requestInstall = (modelId: string, taskIndex: number) => {
    setModelToInstall({ modelId, taskIndex });
  };

  const confirmInstall = async () => {
    if (!modelToInstall) return;
    const { modelId, taskIndex } = modelToInstall;
    
    // Optimistically update
    setInstalledModels(prev => [...prev, modelId]);
    updateAiTask(taskIndex, { model: modelId });
    setModelToInstall(null);

    try {
      await fetch(`${backendUrl}/api/models/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      });
    } catch (e) {
      console.error("Failed to install model", e);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = aiTasks.findIndex((_, i) => `task-${i}` === active.id);
      const newIndex = aiTasks.findIndex((_, i) => `task-${i}` === over.id);
      reorderAiTasks(oldIndex, newIndex);
    }
  };

  const showDeletedToast = () => {
    setToastVisible(true);
    if (toastTimer) clearTimeout(toastTimer);
    const timer = setTimeout(() => setToastVisible(false), 5000);
    setToastTimer(timer);
  };

  const handleUndo = () => {
    undo();
    setToastVisible(false);
    if (toastTimer) clearTimeout(toastTimer);
  };

  const isActive = step === 2;
  const isPast = step > 2;

  if (!isActive && !isPast) return null;

  if (!isActive) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-[var(--nf-border)] bg-transparent opacity-80 hover:opacity-100 transition-opacity flex items-center justify-between group cursor-pointer" onClick={() => setStep(2)}>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-[var(--nf-bg-surface)] border border-[var(--nf-border)] flex items-center justify-center text-[var(--nf-text-muted)]">
            <Bot size={14} className="text-[var(--nf-accent-purple)]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--nf-text-muted)] uppercase tracking-wider">Step 2: AI Processing</h4>
            <p className="text-sm font-medium text-[var(--nf-text-primary)]">
              {aiTasks.length} Task{aiTasks.length !== 1 ? 's' : ''} Configured
            </p>
          </div>
        </div>
        <button onClick={() => setStep(2)} className="px-3 py-1.5 text-xs font-bold text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] bg-[var(--nf-bg-input)] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className={`mb-12 p-6 rounded-2xl border transition-colors duration-300 bg-[var(--nf-bg-surface)] border-[var(--nf-accent-purple)]/50 shadow-lg shadow-[var(--nf-accent-purple)]/5 relative`}>
      <h3 className="text-xl font-bold text-[var(--nf-text-primary)] mb-4">2. What should the AI do?</h3>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={aiTasks.map((_, i) => `task-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          {aiTasks.map((task, idx) => (
            <TaskItem 
              key={`task-${idx}`}
              id={`task-${idx}`}
              task={task} 
              idx={idx} 
              updateAiTask={updateAiTask} 
              removeAiTask={removeAiTask} 
              canRemove={aiTasks.length > 1} 
              showDeletedToast={showDeletedToast}
              installedModels={installedModels}
              requestInstall={requestInstall}
            />
          ))}
        </SortableContext>
      </DndContext>
      
      <div className="flex gap-4 items-center justify-between pt-4 border-t border-[var(--nf-border)]">
        <button onClick={addAiTask} className="text-[var(--nf-accent-purple)] hover:text-[var(--nf-accent-purple)]/80 font-bold flex items-center gap-2 text-sm transition-colors">
          <Plus size={16}/> Add another AI step
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setStep(1)} className="px-4 py-2.5 text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] font-bold transition-colors">
            Back to Source
          </button>
          <button onClick={() => setStep(3)} className="px-6 py-2.5 bg-[var(--nf-accent-purple)] hover:bg-[var(--nf-accent-purple)]/80 text-[var(--nf-bg-primary)] font-bold rounded-lg transition-colors">
            Next: Set Schedule
          </button>
        </div>
      </div>

      {/* Undo Toast */}
      {toastVisible && undoStack.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="glass rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl border border-[var(--nf-border)]">
            <span className="text-sm font-medium text-[var(--nf-text-primary)]">Task removed</span>
            <div className="w-px h-4 bg-[var(--nf-border)]"></div>
            <button 
              onClick={handleUndo}
              className="text-[var(--nf-accent-cyan)] hover:text-[var(--nf-text-primary)] font-bold text-sm flex items-center gap-1.5 transition-colors"
            >
              <Undo2 size={16} /> Undo
            </button>
          </div>
        </div>
      )}

      {/* Model Install Modal */}
      {modelToInstall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass border border-[var(--nf-accent-purple)]/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-xl font-bold text-[var(--nf-text-primary)] mb-4 flex items-center gap-2">
              <Bot className="text-[var(--nf-accent-purple)]" />
              Model Not Installed
            </h3>
            
            <div className="space-y-4 mb-6 text-sm text-[var(--nf-text-secondary)]">
              <p>The model <strong className="text-[var(--nf-text-primary)]">{findModel(modelToInstall.modelId)?.name || modelToInstall.modelId}</strong> is not currently installed on your machine.</p>
              <p>Would you like NeuralFlow to automatically download and install it in the background using Ollama? (This may take several minutes depending on your internet connection).</p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setModelToInstall(null)} 
                className="flex-1 py-3 bg-[var(--nf-bg-input)] hover:bg-[var(--nf-bg-surface-hover)] text-[var(--nf-text-primary)] font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmInstall} 
                className="flex-1 py-3 bg-[var(--nf-accent-purple)] hover:bg-[var(--nf-accent-purple)]/80 text-[var(--nf-bg-primary)] font-bold rounded-xl transition-colors"
              >
                Install & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
