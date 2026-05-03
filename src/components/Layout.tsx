import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../lib/auth';

export function Layout() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-[#0B0F19] text-white">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden text-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background ambient glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>
        
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 z-10 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
