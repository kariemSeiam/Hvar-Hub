import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-white text-xl font-semibold mb-2">HVAR Hub</h2>
        <p className="text-blue-200 text-sm">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen; 