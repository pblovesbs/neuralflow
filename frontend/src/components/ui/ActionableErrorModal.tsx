'use client';

import React, { useState } from 'react';
import useFlowStore from '@/store/flowStore';

export default function ActionableErrorModal() {
  const { actionableError, clearActionableError, resumeWorkflow } = useFlowStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!actionableError) return null;

  const handleAction = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      if (actionableError.action_type === 'api_call' && actionableError.action_endpoint) {
        // e.g. /api/system/start-ollama
        const backendUrl = 'http://localhost:8000';
        const res = await fetch(`${backendUrl}${actionableError.action_endpoint}`, {
          method: 'POST',
        });
        
        if (!res.ok) {
          throw new Error(`Action failed with status ${res.status}`);
        }
        
        // Wait briefly for the service to spin up
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (actionableError.resumable && actionableError.node_id && actionableError.workflow_id) {
          await resumeWorkflow(actionableError.workflow_id, actionableError.node_id);
        }
        
        clearActionableError();
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-red-500/50 rounded-xl shadow-2xl p-6 w-full max-w-md text-white">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 text-red-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold">{actionableError.title}</h2>
        </div>

        {/* Message */}
        <p className="text-slate-300 mb-6">
          {actionableError.message}
        </p>

        {/* Manual Command Fallback */}
        {actionableError.manual_command && (
          <div className="mb-6">
            <p className="text-sm text-slate-400 mb-2">Or run manually in terminal:</p>
            <code className="block bg-black/50 border border-slate-700 rounded p-3 text-emerald-400 font-mono text-sm select-all">
              {actionableError.manual_command}
            </code>
          </div>
        )}
        
        {errorMsg && (
          <div className="mb-4 text-red-400 text-sm">{errorMsg}</div>
        )}

        {/* Action Area */}
        <div className="flex justify-end gap-3">
          <button
            onClick={clearActionableError}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Dismiss
          </button>
          
          <button
            onClick={handleAction}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              actionableError.action_label
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}
