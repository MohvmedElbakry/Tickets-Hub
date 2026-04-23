import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { EventsProvider } from './context/EventsContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UIProvider>
          <EventsProvider>
            <App />
          </EventsProvider>
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
