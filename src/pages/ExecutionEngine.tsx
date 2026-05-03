import React, { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Calendar, Target, Play, CheckCircle2, Circle, Activity } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';
import { cn } from '../lib/utils';

export function ExecutionEngine() {
  const { user } = useAuth();
  const { selectedAccountId, platform, datePreset, metaToken, googleToken, tiktokToken } = useFilters();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);

  const getToken = useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken]);

  useEffect(() => {
    const fetchTasks = async () => {
      const token = getToken();
      if (!token || !selectedAccountId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const headers = {
        'x-user-id': user!.uid,
        [`x-${platform}-token`]: token
      };

      try {
        // Fetch campaigns and insights
        const [campRes, insightRes] = await Promise.all([
          fetch(`/api/campaigns?accountId=${selectedAccountId}&platform=${platform}`, { headers }),
          fetch(`/api/insights?accountId=${selectedAccountId}&platform=${platform}&datePreset=${datePreset}`, { headers })
        ]);

        const [campData, insightData] = await Promise.all([
          campRes.json(), insightRes.json()
        ]);

        const campaigns = campData.campaigns || [];
        const insights = insightData.insights || [];

        // Combine data
        const combinedData = campaigns.map((campaign: any) => {
          const metrics = insights.find((i: any) => i.id === campaign.id)?.metrics || { spend: 0, roas: 0, cpa: 0, ctr: 0, cvr: 0, cpm: 0 };
          return { ...campaign, metrics, type: 'campaign' };
        }).filter((c: any) => c.metrics.spend > 0);

        // Send to analysis engine
        const analysisRes = await fetch('/api/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: combinedData })
        });
        const analysisData = await analysisRes.json();
        const analyzedItems = analysisData.analyzedItems || [];

        // Generate tasks based on analysis
        const generatedTasks: any[] = [];
        analyzedItems.forEach((item: any, index: number) => {
          if (item.analysis.decision === 'SCALE') {
            generatedTasks.push({
              id: `task-scale-${item.id}`,
              title: `Scale Campaign: ${item.name}`,
              description: item.analysis.suggestedAction,
              type: 'SCALE',
              status: 'TODO',
              priority: 'HIGH'
            });
          } else if (item.analysis.decision === 'KILL') {
            generatedTasks.push({
              id: `task-kill-${item.id}`,
              title: `Pause Campaign: ${item.name}`,
              description: item.analysis.suggestedAction,
              type: 'KILL',
              status: 'TODO',
              priority: 'HIGH'
            });
          } else if (item.analysis.decision === 'OPTIMIZE') {
            generatedTasks.push({
              id: `task-opt-${item.id}`,
              title: `Optimize Campaign: ${item.name}`,
              description: item.analysis.suggestedAction,
              type: 'OPTIMIZE',
              status: 'TODO',
              priority: 'MEDIUM'
            });
          }
        });

        setTasks(generatedTasks);
      } catch (error) {
        console.error('Failed to fetch tasks', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedAccountId) {
      fetchTasks();
    } else {
      setTasks([]);
      setLoading(false);
    }
  }, [selectedAccountId, platform, datePreset, metaToken, googleToken, tiktokToken, getToken, user]);

  const toggleTaskStatus = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        return { ...t, status: t.status === 'DONE' ? 'TODO' : 'DONE' };
      }
      return t;
    }));
  };

  const executeTask = (task: any) => {
    // 1. Mark task as done
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: 'DONE' } : t));
    
    // 2. Add to Optimization Logs
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      campaignName: task.title,
      action: task.type,
      reason: task.description,
      details: `Executed manually via Execution Engine.`,
      status: 'SUCCESS'
    };
    
    const existingLogs = JSON.parse(localStorage.getItem(`opt_logs_${selectedAccountId}`) || '[]');
    localStorage.setItem(`opt_logs_${selectedAccountId}`, JSON.stringify([newLog, ...existingLogs]));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const token = getToken();
  if (!token || !selectedAccountId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full">
          <CheckSquare className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Not Connected</h2>
          <p className="text-gray-400 mb-6">Connect your account to view execution tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Execution Engine</h1>
          <p className="text-gray-400 text-sm mt-1">Turn strategy into actionable daily tasks based on real performance data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5 bg-[#111827]/50 flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                Daily Action Plan
              </h2>
              <span className="text-sm text-gray-400 font-medium">{tasks.filter(t => t.status === 'DONE').length} / {tasks.length} Completed</span>
            </div>
            
            {tasks.length === 0 ? (
              <div className="p-12 text-center">
                <CheckSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-1">No Tasks Generated</h3>
                <p className="text-gray-400">The analysis engine didn't find any immediate actions required for your campaigns.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {tasks.map(task => (
                  <div 
                    key={task.id} 
                    className={cn(
                      "p-5 flex items-start gap-4 transition-colors hover:bg-white/5",
                      task.status === 'DONE' && "opacity-50 bg-white/5"
                    )}
                  >
                    <button 
                      onClick={() => toggleTaskStatus(task.id)}
                      className="mt-1 flex-shrink-0 text-gray-500 hover:text-blue-400 transition-colors"
                    >
                      {task.status === 'DONE' ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className={cn(
                          "text-base font-medium text-gray-200",
                          task.status === 'DONE' && "line-through text-gray-500"
                        )}>
                          {task.title}
                        </h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                          task.type === 'TEST' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                          task.type === 'SCALE' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          task.type === 'KILL' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}>
                          {task.type}
                        </span>
                        {task.priority === 'HIGH' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            Priority
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">{task.description}</p>
                    </div>
                    {task.status !== 'DONE' && (
                      <button 
                        onClick={() => executeTask(task)}
                        className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors shadow-[0_0_10px_rgba(59,130,246,0.1)]"
                      >
                        <Play className="w-4 h-4" />
                        Execute
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-white mb-5 flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <Target className="w-4 h-4 text-blue-400" />
              </div>
              Weekly Goals
            </h3>
            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>
                <div>
                  <p className="text-sm font-medium text-gray-200">Execute Analysis Recommendations</p>
                  <p className="text-xs text-gray-400 mt-1">Complete all {tasks.length} tasks generated by the AI.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>
                <div>
                  <p className="text-sm font-medium text-gray-200">Scale winning campaigns</p>
                  <p className="text-xs text-gray-400 mt-1">Increase budget on ROAS &gt; target</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
