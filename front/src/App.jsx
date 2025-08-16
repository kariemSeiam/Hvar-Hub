import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import OrderManagementPage from './pages/OrderManagementPage';
import { ServiceActionsPage } from './components/service';
import StockManagementPage from './pages/StockManagementPage';
import NotFoundPage from './pages/NotFoundPage';
import DemoPage from './pages/DemoPage';
import { Toaster, ToastBar, toast } from 'react-hot-toast';

function App() {
  return (
    <ThemeProvider initialTheme="light" initialRTL={true}>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <Routes>
            <Route path="/" element={<OrderManagementPage />} />
            <Route path="/orders" element={<OrderManagementPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/services" element={<ServiceActionsPage />} />
            <Route path="/stock" element={<StockManagementPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
        <Toaster
          position="top-center"
          reverseOrder={false}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            className: '',
            duration: 3000,
            style: {
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              maxWidth: '90vw',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              direction: 'rtl'
            },
            success: {
              duration: 2500,
            },
          }}
        >
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <div className="flex items-center gap-3">
                  {icon}
                  <div className="truncate" dir="rtl">{message}</div>
                  <button
                    aria-label="إغلاق"
                    onClick={() => toast.dismiss(t.id)}
                    className="ml-2 rounded p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    ✕
                  </button>
                </div>
              )}
            </ToastBar>
          )}
        </Toaster>
      </Router>
    </ThemeProvider>
  );
}

export default App;
