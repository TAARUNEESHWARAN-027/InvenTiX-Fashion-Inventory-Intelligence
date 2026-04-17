import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const ErrorCard: React.FC<{ title?: string; message: string; onRetry?: () => void }> = ({ title = 'Failed to load', message, onRetry }) => {
  return (
    <div className="bg-navy-800 border border-danger/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
      <div className="w-12 h-12 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-navy-700 hover:bg-navy-600 border border-navy-600 text-white font-semibold rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      )}
    </div>
  );
};
