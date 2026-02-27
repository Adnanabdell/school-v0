import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import i18n from './i18n';
import { I18nextProvider } from 'react-i18next';
import { QueryProvider } from './providers/QueryProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <ThemeProvider>
          <I18nextProvider i18n={i18n}>
            <App />
            <Toaster 
              position="top-center"
              reverseOrder={false}
              toastOptions={{
                duration: 3000,
                style: {
                  direction: 'rtl',
                  fontFamily: 'inherit',
                },
              }}
            />
          </I18nextProvider>
        </ThemeProvider>
      </QueryProvider>
    </BrowserRouter>
  </StrictMode>,
);
