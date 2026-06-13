import { useWorkflowStore } from '../store/workflowStore';

export interface ValidationResult {
  isValid: boolean;
  errors: { field: string; message: string; step: number }[];
  warnings: { field: string; message: string }[];
}

export function useValidation(): ValidationResult {
  const store = useWorkflowStore();
  const errors: { field: string; message: string; step: number }[] = [];
  const warnings: { field: string; message: string }[] = [];

  // Step 1 Validation
  if (!store.triggerType) {
    errors.push({ field: 'triggerType', message: 'Please select a data source', step: 1 });
  } else if (store.triggerType === 'email') {
    if (!store.email.trim()) {
      errors.push({ field: 'email', message: 'Email address is required', step: 1 });
    }
    if (!store.appPassword.trim()) {
      errors.push({ field: 'appPassword', message: 'App password is required for email access', step: 1 });
    }
  } else if (store.triggerType === 'folder' || store.triggerType === 'file') {
    if (!store.sourcePath.trim()) {
      errors.push({ field: 'sourcePath', message: 'Source path is required', step: 1 });
    }
  }

  // Step 2 Validation
  const hasValidTask = store.aiTasks.some(t => t.task && t.task.trim() !== '');
  if (!hasValidTask) {
    errors.push({ field: 'aiTasks', message: 'At least one AI step needs a task description', step: 2 });
  }
  store.aiTasks.forEach((task, idx) => {
    if (!task.model) {
      errors.push({ field: `aiTasks.${idx}.model`, message: `Please select an AI model for Step ${idx + 1}`, step: 2 });
    }
  });

  // Step 3 (Output) Validation
  if (!store.targetPath.trim()) {
    errors.push({ field: 'targetPath', message: 'Destination folder is required', step: 3 });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
