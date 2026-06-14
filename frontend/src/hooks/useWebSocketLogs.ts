import { useRef } from 'react';
import { useWorkflowStore } from '../store/workflowStore';

export function useWebSocketLogs(wsUrl: string) {
  const { 
    addLog, 
    setCompletedNodes, 
    setExecutionStatus,
    totalNodes,
    updateNodeStatus
  } = useWorkflowStore();

  const wsRef = useRef<WebSocket | null>(null);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (parseErr) {
          const sanitized = event.data.replace(/[\u0000-\u001F\u007F-\u009F]/g, function (c) {
            return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
          });
          data = JSON.parse(sanitized);
        }
        
        if (data && data.message) {
          addLog(`[${new Date(data.timestamp).toLocaleTimeString()}] ${data.message}`);
          
          if (data.message.includes('──── Executing node:')) {
            setCompletedNodes((prev) => prev + 1);
            if (data.node_id) updateNodeStatus(data.node_id, 'running');
          }
          if (data.level === 'SUCCESS' && data.node_id && data.node_id !== 'system') {
            updateNodeStatus(data.node_id, 'completed');
          }
          if (data.message.includes('completed successfully')) {
            setCompletedNodes(totalNodes);
            setExecutionStatus('completed');
            ws.close();
          }
          if (data.level === 'ERROR' || data.message.includes('FAILED')) {
            if (data.node_id && data.node_id !== 'system') updateNodeStatus(data.node_id, 'error');
            setExecutionStatus('failed');
            ws.close();
          }
        }
      } catch (e) {
        console.error("Failed to parse websocket message", e);
      }
    };

    ws.onerror = () => {
      addLog("❌ WebSocket connection error. Could not stream logs. Retrying...");
      ws.close();
    };

    ws.onclose = () => {
      // If we are still 'running', try to reconnect (Exponential backoff could be added here)
      const currentStatus = useWorkflowStore.getState().executionStatus;
      if (currentStatus === 'running') {
        setTimeout(connect, 3000);
      }
    };
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  return { connect, disconnect };
}
