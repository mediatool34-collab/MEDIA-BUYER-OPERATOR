import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Target, Image as ImageIcon, FlaskConical, Lightbulb, Bell, Settings, ActivitySquare, CheckSquare, Globe, Search, Eye, BrainCircuit, History, Calculator } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Performance Hub', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Competitor Spy', path: '/ad-spy', icon: Eye },
  { name: 'Creative Lab', path: '/creatives', icon: ImageIcon },
  { name: 'Campaign Audit', path: '/campaigns', icon: Target },
  { name: 'Budget Planner', path: '/budget', icon: Calculator },
  { name: 'Scaling & Testing', path: '/scaling', icon: FlaskConical },
  { name: 'Funnel Diagnosis', path: '/funnel', icon: ActivitySquare },
  { name: 'Automation Rules', path: '/automation', icon: CheckSquare },
  { name: 'Market Trends', path: '/market', icon: Globe },
  { name: 'Pre-Funnel Intel', path: '/pre-funnel', icon: BrainCircuit },
  { name: 'Activity Logs', path: '/logs', icon: History },
  { name: 'Smart Alerts', path: '/alerts', icon: Bell },
  { name: 'Connections', path: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="w-64 bg-brand-panel/95 backdrop-blur-xl text-gray-300 flex flex-col h-screen border-r border-brand-border relative z-20 shadow-2xl">
      <div className="p-8">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-3 text-white">
          <div className="p-2 bg-gradient-to-br from-brand-accent/30 to-indigo-500/30 rounded-xl border border-brand-accent/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <Target className="w-5 h-5 text-brand-accent" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Operator AI</span>
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar pb-8">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden',
                isActive
                  ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
              )
            }
          >
            <item.icon className={cn("w-4 h-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3", "group-[.active]:text-brand-accent")} />
            {item.name}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/0 via-brand-accent/0 to-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </NavLink>
        ))}
      </nav>
      <div className="p-6 border-t border-brand-border bg-brand-panel/50">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">System Status</span>
            <span className="text-xs text-gray-400 mt-0.5">All engines operational</span>
          </div>
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)] animate-pulse"></div>
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-40"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
