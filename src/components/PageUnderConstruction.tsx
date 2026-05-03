import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PageUnderConstruction({ title }: { title: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="relative p-6 bg-[#111827] rounded-3xl border border-white/10 shadow-2xl">
          <Construction className="w-16 h-16 text-blue-400" />
        </div>
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
        {title} <span className="text-blue-400">Under Construction</span>
      </h2>
      
      <p className="text-gray-400 max-w-md mx-auto leading-relaxed mb-8">
        Our AI engineers are currently training the models for this module. 
        Check back soon for advanced intelligence and automated optimizations.
      </p>
      
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Go Back
      </button>
    </div>
  );
}
