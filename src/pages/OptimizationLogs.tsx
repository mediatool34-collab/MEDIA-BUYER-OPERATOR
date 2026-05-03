import React, { useState, useEffect } from 'react';
import { ActivitySquare, CheckCircle2, XCircle, TrendingUp, TrendingDown, PauseCircle, Loader2, PlayCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';
import { cn } from '../lib/utils';

export function OptimizationLogs() {
  const { user } = useAuth();
  const { selectedAccountId, platform } = useFilters();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        // Fetch logs from localStorage
        const storedLogs = localStorage.getItem(`opt_logs_${selectedAccountId}`);
        if (storedLogs) {
          setLogs(JSON.parse(storedLogs).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } else {
          setLogs([]);
        }
      } catch (error) {
        console.error('Failed to fetch logs', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedAccountId) {
      fetchLogs();
    } else {
      setLogs([]);
      setLoading(false);
    }
  }, [selectedAccountId, platform]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!selectedAccountId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full">
          <ActivitySquare className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Not Connected</h2>
          <p className="text-gray-400 mb-6">Select an account to view optimization logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Optimization Logs</h1>
          <p className="text-gray-400 text-sm mt-1">History of automated actions taken by the system</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <ActivitySquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No Logs Found</h3>
            <p className="text-gray-400">The auto-optimization system hasn't taken any actions yet. Enable it on the Dashboard.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2.5 rounded-xl flex-shrink-0 mt-1 border shadow-inner",
                      log.action === 'SCALE' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                      log.action === 'PAUSE' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    )}>
                      {log.action === 'SCALE' ? <TrendingUp className="w-5 h-5" /> :
                       log.action === 'PAUSE' ? <PauseCircle className="w-5 h-5" /> :
                       <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-lg font-bold text-gray-200">{log.campaignName}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border",
                          log.status === 'SUCCESS' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          {log.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-400 mb-1">
                        Action: <span className="text-gray-200">{log.details}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Reason: {log.reason}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 whitespace-nowrap bg-[#0B0F19] px-3 py-1 rounded-lg border border-white/5">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
