import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AiTask {
  role: string;
  task: string;
  format: string;
  model: string;
  delaySeconds: number;
}

export interface RunHistoryEntry {
  id: string;
  timestamp: number;
  status: 'completed' | 'failed';
  summary: string;
  automationName: string;
  details?: {
    totalTimeSeconds?: number;
    itemsProcessed?: number;
    itemsGenerated?: number;
    targetPath?: string;
  };
}

export interface SavedAutomation {
  id: string;
  name: string;
  savedAt: number;
  state: Partial<WorkflowState>;
}

export interface WorkflowTemplate {
  triggerType: 'email' | 'folder' | 'file';
  email?: string;
  aiTasks: AiTask[];
  targetPathHint?: string;
  automationName: string;
}

interface WorkflowState {
  // Persistence & Naming
  automationId: string | null;
  setAutomationId: (id: string | null) => void;
  automationName: string;
  setAutomationName: (name: string) => void;
  lastSavedAt: number | null;
  savedAutomations: SavedAutomation[];
  saveCurrentAutomation: () => void;
  loadAutomation: (id: string) => void;
  deleteAutomation: (id: string) => void;
  loadTemplate: (template: WorkflowTemplate) => void;

  step: number;
  setStep: (step: number) => void;

  triggerType: 'email' | 'folder' | 'file' | null;
  setTriggerType: (type: 'email' | 'folder' | 'file' | null) => void;

  email: string;
  setEmail: (email: string) => void;
  appPassword: string;
  setAppPassword: (pw: string) => void;
  itemCount: string;
  setItemCount: (count: string) => void;
  sourcePath: string;
  setSourcePath: (path: string) => void;

  // Multi-step AI Routing
  topology: 'pipeline_final' | 'pipeline_all' | 'parallel';
  setTopology: (topology: 'pipeline_final' | 'pipeline_all' | 'parallel') => void;
  outputStrategy: 'single_file' | 'separate_files' | 'separate_folders';
  setOutputStrategy: (strategy: 'single_file' | 'separate_files' | 'separate_folders') => void;

  // AI Tasks & Undo
  aiTasks: AiTask[];
  setAiTasks: (tasks: AiTask[]) => void;
  updateAiTask: (index: number, task: Partial<AiTask>) => void;
  addAiTask: () => void;
  removeAiTask: (index: number) => void;
  reorderAiTasks: (fromIndex: number, toIndex: number) => void;
  undoStack: AiTask[][];
  pushUndo: () => void;
  undo: () => void;

  // Schedule
  scheduleEnabled: boolean;
  setScheduleEnabled: (enabled: boolean) => void;
  schedulePreset: 'every5min' | 'hourly' | 'daily' | 'weekly' | 'weekdays' | 'custom';
  setSchedulePreset: (preset: 'every5min' | 'hourly' | 'daily' | 'weekly' | 'weekdays' | 'custom') => void;
  cronExpression: string;
  setCronExpression: (expr: string) => void;

  // Notifications
  notifyOnRun: boolean;
  setNotifyOnRun: (notify: boolean) => void;
  notifyEmail: string;
  setNotifyEmail: (email: string) => void;

  targetPath: string;
  setTargetPath: (path: string) => void;
  outputFormat: string;
  setOutputFormat: (format: string) => void;

  // Execution State (Not persisted typically, but zustand/persist handles this via partialize if needed, though here we just reset it on load)
  isExecuting: boolean;
  setIsExecuting: (isExecuting: boolean) => void;
  
  logs: string[];
  addLog: (log: string) => void;
  clearLogs: () => void;

  executionStatus: 'running' | 'completed' | 'failed' | null;
  setExecutionStatus: (status: 'running' | 'completed' | 'failed' | null) => void;

  completedNodes: number;
  setCompletedNodes: (nodes: number | ((prev: number) => number)) => void;

  totalNodes: number;
  setTotalNodes: (nodes: number) => void;
  
  nodeStatuses: Record<string, 'idle' | 'running' | 'completed' | 'error'>;
  updateNodeStatus: (nodeId: string, status: 'idle' | 'running' | 'completed' | 'error') => void;

  // Run History
  runHistory: RunHistoryEntry[];
  addRunHistoryEntry: (entry: Omit<RunHistoryEntry, 'id' | 'timestamp'>) => void;

  reset: () => void;
}

const initialAiTask: AiTask = { role: '', task: '', format: '', model: 'qwen2.5:0.5b', delaySeconds: 0 };

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      automationId: null,
      setAutomationId: (id) => set({ automationId: id }),
      automationName: '',
      setAutomationName: (name) => set({ automationName: name }),
      lastSavedAt: null,
      savedAutomations: [],
      saveCurrentAutomation: () => {
        const state = get();
        if (!state.automationName) return;
        
        let currentId = state.automationId;
        if (!currentId) {
          currentId = `auto_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
          set({ automationId: currentId });
        }

        const newSaved: SavedAutomation = {
          id: currentId,
          name: state.automationName,
          savedAt: Date.now(),
          state: {
            automationName: state.automationName,
            triggerType: state.triggerType,
            email: state.email,
            appPassword: state.appPassword,
            itemCount: state.itemCount,
            sourcePath: state.sourcePath,
            topology: state.topology,
            outputStrategy: state.outputStrategy,
            aiTasks: state.aiTasks,
            scheduleEnabled: state.scheduleEnabled,
            schedulePreset: state.schedulePreset,
            cronExpression: state.cronExpression,
            notifyOnRun: state.notifyOnRun,
            notifyEmail: state.notifyEmail,
            targetPath: state.targetPath
          }
        };

        set(s => {
          const exists = s.savedAutomations.findIndex(a => a.id === currentId);
          let newAutomations;
          if (exists >= 0) {
            newAutomations = [...s.savedAutomations];
            newAutomations[exists] = newSaved;
          } else {
            newAutomations = [...s.savedAutomations, newSaved];
          }
          return {
            savedAutomations: newAutomations,
            lastSavedAt: Date.now()
          };
        });
      },
      loadAutomation: (id) => {
        const state = get();
        const saved = state.savedAutomations.find(a => a.id === id);
        if (saved && saved.state) {
          set({ ...saved.state, automationId: id, step: 1, isExecuting: false, executionStatus: null, logs: [], nodeStatuses: {} });
        }
      },
      deleteAutomation: (id: string) => {
        set(state => ({
          savedAutomations: state.savedAutomations.filter(a => a.id !== id)
        }));
      },
      loadTemplate: (template) => {
        set({
          automationId: null,
          automationName: template.automationName,
          triggerType: template.triggerType,
          email: template.email || '',
          itemCount: '1',
          topology: 'pipeline_final',
          outputStrategy: 'single_file',
          aiTasks: template.aiTasks,
          targetPath: template.targetPathHint || '',
          step: 1,
          isExecuting: false,
          executionStatus: null,
          logs: [],
          nodeStatuses: {},
          scheduleEnabled: false,
          schedulePreset: 'every5min',
          cronExpression: '*/5 * * * *',
          notifyOnRun: false,
          notifyEmail: template.email || '',
          undoStack: []
        });
      },

      step: 1,
      setStep: (step) => set({ step }),

      triggerType: null,
      setTriggerType: (triggerType) => set({ triggerType }),

      email: '',
      setEmail: (email) => set({ email }),
      appPassword: '',
      setAppPassword: (appPassword) => set({ appPassword }),
      itemCount: '1',
      setItemCount: (itemCount) => set({ itemCount }),
      sourcePath: '',
      setSourcePath: (sourcePath) => set({ sourcePath }),

      topology: 'pipeline_final',
      setTopology: (topology) => set({ topology }),
      outputStrategy: 'single_file',
      setOutputStrategy: (outputStrategy) => set({ outputStrategy }),

      aiTasks: [{ ...initialAiTask }],
      setAiTasks: (aiTasks) => {
        get().pushUndo();
        set({ aiTasks });
      },
      updateAiTask: (index, updatedTask) => set((state) => {
        const newTasks = [...state.aiTasks];
        newTasks[index] = { ...newTasks[index], ...updatedTask };
        return { aiTasks: newTasks };
      }),
      addAiTask: () => set((state) => {
        state.pushUndo();
        return { aiTasks: [...state.aiTasks, { ...initialAiTask }] };
      }),
      removeAiTask: (index) => set((state) => {
        state.pushUndo();
        return { aiTasks: state.aiTasks.filter((_, i) => i !== index) };
      }),
      reorderAiTasks: (fromIndex, toIndex) => set((state) => {
        state.pushUndo();
        const newTasks = [...state.aiTasks];
        const [movedTask] = newTasks.splice(fromIndex, 1);
        newTasks.splice(toIndex, 0, movedTask);
        return { aiTasks: newTasks };
      }),
      undoStack: [],
      pushUndo: () => set((state) => {
        const newStack = [...state.undoStack, [...state.aiTasks]];
        if (newStack.length > 20) newStack.shift(); // Max 20 states
        return { undoStack: newStack };
      }),
      undo: () => set((state) => {
        if (state.undoStack.length === 0) return {};
        const newStack = [...state.undoStack];
        const previousTasks = newStack.pop()!;
        return { aiTasks: previousTasks, undoStack: newStack };
      }),

      scheduleEnabled: false,
      setScheduleEnabled: (enabled) => set({ scheduleEnabled: enabled }),
      schedulePreset: 'every5min',
      setSchedulePreset: (preset) => set({ schedulePreset: preset }),
      cronExpression: '*/5 * * * *',
      setCronExpression: (expr) => set({ cronExpression: expr }),

      notifyOnRun: false,
      setNotifyOnRun: (notify) => set({ notifyOnRun: notify }),
      notifyEmail: '',
      setNotifyEmail: (email) => set({ notifyEmail: email }),

      targetPath: '',
      setTargetPath: (path) => set({ targetPath: path }),

      outputFormat: 'Plain Text',
      setOutputFormat: (format) => set({ outputFormat: format }),

      isExecuting: false,
      setIsExecuting: (isExecuting) => set({ isExecuting }),

      logs: [],
      addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
      clearLogs: () => set({ logs: [] }),

      executionStatus: null,
      setExecutionStatus: (executionStatus) => set({ executionStatus }),

      completedNodes: 0,
      setCompletedNodes: (val) => set((state) => ({ 
        completedNodes: typeof val === 'function' ? val(state.completedNodes) : val 
      })),

      totalNodes: 0,
      setTotalNodes: (totalNodes) => set({ totalNodes }),

      nodeStatuses: {},
      updateNodeStatus: (nodeId, status) => set((state) => ({
        nodeStatuses: { ...state.nodeStatuses, [nodeId]: status }
      })),

      runHistory: [],
      addRunHistoryEntry: (entry) => set((state) => {
        const newEntry: RunHistoryEntry = {
          ...entry,
          id: `run_${Date.now()}`,
          timestamp: Date.now()
        };
        const newHistory = [newEntry, ...state.runHistory];
        if (newHistory.length > 10) newHistory.pop(); // Keep last 10
        return { runHistory: newHistory };
      }),
      reset: () => set({
        automationId: null,
        automationName: '',
        step: 1,
        triggerType: null,
        email: '',
        appPassword: '',
        itemCount: '1',
        sourcePath: '',
        topology: 'pipeline_final',
        outputStrategy: 'single_file',
        aiTasks: [{ ...initialAiTask }],
        targetPath: '',
        scheduleEnabled: false,
        schedulePreset: 'every5min',
        cronExpression: '*/5 * * * *',
        notifyOnRun: false,
        notifyEmail: '',
        isExecuting: false,
        logs: [],
        executionStatus: null,
        completedNodes: 0,
        totalNodes: 0,
        nodeStatuses: {},
        undoStack: []
      })
    }),
    {
      name: 'neuralflow-standard-storage',
      partialize: (state) => ({
        automationName: state.automationName,
        savedAutomations: state.savedAutomations,
        runHistory: state.runHistory,
        triggerType: state.triggerType,
        email: state.email,
        appPassword: state.appPassword,
        sourcePath: state.sourcePath,
        aiTasks: state.aiTasks,
        targetPath: state.targetPath,
        scheduleEnabled: state.scheduleEnabled,
        schedulePreset: state.schedulePreset,
        cronExpression: state.cronExpression,
        notifyOnRun: state.notifyOnRun,
        notifyEmail: state.notifyEmail
      }),
    }
  )
);
