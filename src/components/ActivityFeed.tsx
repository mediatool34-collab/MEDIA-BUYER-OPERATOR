import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, TrendingUp, PauseCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  timestamp: string;
  campaignName: string;
  action: 'SCALE' | 'PAUSE' | 'REDUCE_BUDGET' | 'OPTIMIZE';
  reason: string;
  details: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
}

export function ActivityFeed({ logs }: { logs: ActivityLog[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="w-10 h-10 text-gray-600 mb-3 opacity-20" />
        <p className="text-gray-500 text-sm italic">No recent activity detected</p>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'SCALE': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'PAUSE': return <PauseCircle className="w-4 h-4 text-red-400" />;
      case 'REDUCE_BUDGET': return <ArrowDownRight className="w-4 h-4 text-yellow-400" />;
      default: return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'SCALE': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'PAUSE': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'REDUCE_BUDGET': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="glass-card p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="flex items-start gap-4 relative z-10">
            <div className={cn("p-2 rounded-xl border shrink-0", getActionColor(log.action))}>
              {getActionIcon(log.action)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-bold text-white truncate">{log.campaignName}</h4>
                <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider", getActionColor(log.action))}>
                  {log.action.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">•</span>
                <span className="text-[10px] text-gray-400 font-medium truncate">{log.reason}</span>
              </div>
              
              <p className="text-xs text-gray-300 leading-relaxed bg-[#0B0F19]/50 p-2 rounded-lg border border-white/5">
                {log.details}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
