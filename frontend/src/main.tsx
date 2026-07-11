// T025: Entry point — DepartmentsProvider added (Feature 014)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { AuthProvider } from './context/AuthContext';
import { DepartmentsProvider } from './context/DepartmentsContext';
import App from './App';
import { initSentry } from './observability';
import ErrorFallback from './components/ErrorFallback';
import './index.css';

// Issue #58: initialise Sentry before rendering (no-op without VITE_SENTRY_DSN).
initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <BrowserRouter>
        <AuthProvider>
          <DepartmentsProvider>
            <App />
          </DepartmentsProvider>
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
