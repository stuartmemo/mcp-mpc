import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

async function start() {
  if (
    import.meta.env.DEV
    && new URLSearchParams(window.location.search).has('webmcp-test')
    && !document.modelContext
  ) {
    const { installWebMcpDevShim } = await import('./webmcp/devShim');
    installWebMcpDevShim();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
