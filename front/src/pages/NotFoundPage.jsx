import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-white mb-4">404</h1>
          <h2 className="text-3xl font-semibold text-white mb-4">Page Not Found</h2>
          <p className="text-blue-200 text-lg mb-8">
            The page you're looking for doesn't exist in HVAR Hub.
          </p>
        </div>

        <div className="space-y-4">
          <Link 
            to="/" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            Go Home
          </Link>
          
          <div className="text-blue-200 text-sm">
            <p>Available pages:</p>
            <div className="mt-2 space-y-1">
              <Link to="/order-management" className="block hover:text-white transition-colors">Order Management</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 