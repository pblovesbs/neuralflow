'use client';
import { useEffect } from 'react';

export default function FetchInterceptor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any)._fetchIntercepted) return;
    
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      let [resource, config] = args;
      
      let urlStr = '';
      if (typeof resource === 'string') {
        urlStr = resource;
      } else if (resource instanceof Request) {
        urlStr = resource.url;
      } else if (resource instanceof URL) {
        urlStr = resource.toString();
      }

      if (urlStr.includes('localhost:8000') || urlStr.includes('127.0.0.1:8000') || urlStr.startsWith('/api/')) {
        config = config || {};
        const headers = new Headers(config.headers || {});
        headers.set('X-API-Key', 'nf-local-dev-key');
        config.headers = headers;
        
        if (resource instanceof Request) {
            resource = new Request(resource, config);
            return originalFetch(resource);
        }
      }
      return originalFetch(resource, config);
    };
    
    (window as any)._fetchIntercepted = true;
  }, []);
  
  return null;
}
