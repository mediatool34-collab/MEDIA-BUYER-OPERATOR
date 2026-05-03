import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Zap, BrainCircuit, RefreshCw, ToggleLeft, ToggleRight, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';

export function SystemIntelligence() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/intelligence/status');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const toggleAutoOpt = async () => {
    if (!data) return;
    setToggling(true);
    try {
      const res = await fetch('/api/intelligence/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !data.autoOptimizationEnabled })
      });
      const json = await res.json();
      setData({ ...data, autoOptimizationEnabled: json.autoOptimizationEnabled });
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">System Error</h2>
          <p className="text-red-300 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <BrainCircuit className="w-6 h-6 text-indigo-400" />
            </div>
            System Intelligence
          </h1>
          <p className="text-gray-400 text-sm mt-1">Autonomous monitoring, fixing, and optimization engine.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-[#111827]/50 px-4 py-2 rounded-xl border border-white/5 shadow-inner">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Auto Optimization</span>
            <span className="text-xs text-gray-400">Let AI manage budgets & status</span>
          </div>
          <button 
            onClick={toggleAutoOpt} 
            disabled={toggling}
            className={cn("transition-colors", data?.autoOptimizationEnabled ? "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" : "text-gray-600")}
          >
            {data?.autoOptimizationEnabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Self Healing Engine */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 bg-[#0B0F19]/50 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Wrench className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-semibold text-white">Self-Healing Engine</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-96 space-y-6 custom-scrollbar">
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Active Issues</h3>
              {data?.activeIssues.length === 0 ? (
                <p className="text-sm text-gray-500 italic bg-[#111827]/30 p-3 rounded-lg border border-white/5">No active issues detected.</p>
              ) : (
                <div className="space-y-2">
                  {data?.activeIssues.map((issue: any) => (
                    <div key={issue.id} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3 shadow-inner">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-300">{issue.type.replace('_', ' ')}</p>
                        <p className="text-xs text-red-200/70 mt-0.5">{issue.description}</p>
                        <p className="text-[10px] text-red-500/50 mt-1.5 font-mono">{new Date(issue.detectedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Auto-Fixes</h3>
              {data?.autoFixes.length === 0 ? (
                <p className="text-sm text-gray-500 italic bg-[#111827]/30 p-3 rounded-lg border border-white/5">No recent fixes.</p>
              ) : (
                <div className="space-y-2">
                  {data?.autoFixes.map((fix: any) => (
                    <div key={fix.id} className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl flex items-start gap-3 shadow-inner">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-green-300">{fix.actionTaken}</p>
                        <p className="text-xs text-green-200/70 mt-0.5">Resolved issue {fix.issueId}</p>
                        <p className="text-[10px] text-green-500/50 mt-1.5 font-mono">{new Date(fix.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auto Optimization Engine */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 bg-[#0B0F19]/50 flex items-center gap-2">
            <div className="p-1.5 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <h2 className="font-semibold text-white">Optimization Actions</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-96 custom-scrollbar">
            {data?.optimizationActions.length === 0 ? (
              <p className="text-sm text-gray-500 italic bg-[#111827]/30 p-3 rounded-lg border border-white/5">No optimization actions taken yet.</p>
            ) : (
              <div className="space-y-3">
                {data?.optimizationActions.map((action: any) => (
                  <div key={action.id} className="p-3 bg-[#111827]/50 border border-white/5 rounded-xl flex items-start gap-3 shadow-inner">
                    <div className={cn(
                      "p-2 rounded-lg flex-shrink-0 border",
                      action.action === 'SCALE' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                      action.action === 'REDUCE' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                      action.action === 'PAUSE' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider border",
                          action.action === 'SCALE' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          action.action === 'REDUCE' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          action.action === 'PAUSE' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}>{action.action}</span>
                        <span className="text-sm font-semibold text-white">{action.campaignName}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1.5">{action.reason}</p>
                      <p className="text-[10px] text-gray-500 mt-1.5 font-mono">{new Date(action.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Smart Learning Engine */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col lg:col-span-2">
          <div className="p-4 border-b border-white/10 bg-[#0B0F19]/50 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <BrainCircuit className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="font-semibold text-white">Smart Learning Insights</h2>
          </div>
          <div className="p-4 overflow-x-auto custom-scrollbar">
            {data?.learningInsights.length === 0 ? (
              <p className="text-sm text-gray-500 italic bg-[#111827]/30 p-3 rounded-lg border border-white/5">No learning insights generated yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Problem Detected</th>
                    <th className="pb-3 font-semibold">Action Taken</th>
                    <th className="pb-3 font-semibold">Result</th>
                    <th className="pb-3 font-semibold">System Insight</th>
                    <th className="pb-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data?.learningInsights.map((insight: any) => (
                    <tr key={insight.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4 text-white font-medium">{insight.problem}</td>
                      <td className="py-4 pr-4 text-gray-400">{insight.actionTaken}</td>
                      <td className="py-4 pr-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                          insight.result === 'IMPROVED' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          insight.result === 'FAILED' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        )}>
                          {insight.result}
                        </span>
                      </td>
                      <td className="py-4 pr-4 font-medium text-indigo-300">{insight.insight}</td>
                      <td className="py-4 text-gray-500 text-xs whitespace-nowrap font-mono">{new Date(insight.timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
