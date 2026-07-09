
import React from 'react';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerContent?: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({ title, children, className = '', headerContent }) => {
  return (
    <div className={`bg-gray-800 rounded-lg shadow-2xl flex flex-col h-full ${className}`}>
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-teal-400">{title}</h2>
        {headerContent}
      </div>
      {children}
    </div>
  );
};

export default Panel;
