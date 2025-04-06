import React from 'react';

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">gHosted</h1>
        <p className="text-gray-600 text-center mb-4">
          A decentralized social platform connecting people across devices.
        </p>
        <div className="flex justify-center">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Start Using gHosted
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
