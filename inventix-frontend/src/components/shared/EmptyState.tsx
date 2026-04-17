import React from 'react';

export const EmptyState: React.FC<{ icon: any; title: string; description: string; action?: React.ReactNode }> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-navy-700/50 border border-navy-700 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-sm">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
