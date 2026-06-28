// T025: Entry point — DepartmentsProvider added (Feature 014)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DepartmentsProvider } from './context/DepartmentsContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DepartmentsProvider>
          <App />
        </DepartmentsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
