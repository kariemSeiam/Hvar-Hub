import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoadingScreen from './components/common/LoadingScreen';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy load pages
const OrderManagementPage = lazy(() => import('./pages/OrderManagementPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const HvarHub = () => {
  return (
    <ThemeProvider initialTheme="dark" initialRTL={true}>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
          <div dir="rtl" lang="ar">
            <Routes>
              {/* Main Routes */}
              <Route path="/" element={<Navigate replace to="/order-management" />} />
              <Route path="/order-management" element={<OrderManagementPage />} />
              {/* Error Routes */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
};

export default HvarHub;