import React, { useState, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, Activity, ChevronDown, ChevronUp, AlertOctagon, TrendingDown, DollarSign, PauseCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';
import { cn } from '../lib/utils';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  campaignId: string;
  campaignName: string;
  problem: string;
  cause: string;
  suggestedFix: string;
  icon: React.ElementType;
  metrics: {
    spend: number;
    cpa: number;
    ctr: number;
    roas: number;
  };
}

export function Alerts() {
  const { user } = useAuth();
  const { selectedAccountId, datePreset, metaToken, googleToken, tiktokToken, platform } = useFilters();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const getToken = useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken]);

  const fetchCampaignsAndGenerateAlerts = useCallback(async () => {
    const token = getToken();
    if (!token || !selectedAccountId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    const headers = {
      'x-user-id': user!.uid,
      [`x-${platform}-token`]: token
    };

    try {
      const [campRes, insightRes] = await Promise.all([
        fetch(`/api/campaigns?accountId=${selectedAccountId}&platform=${platform}`, { headers }),
        fetch(`/api/insights?accountId=${selectedAccountId}&platform=${platform}&datePreset=${datePreset}`, { headers })
      ]);

      const [campData, insightData] = await Promise.all([
        campRes.json(), insightRes.json()
      ]);

      if (campData.error) throw new Error(campData.error);
      if (insightData.error) throw new Error(insightData.error);

      const campaigns = campData.campaigns || [];
      const insights = insightData.insights || [];
      const itemsToAnalyze = campaigns.map((camp: any) => {
        const insight = insights.find((i: any) => i.id === camp.id);
        const rawMetrics = insight?.metrics || { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 };
        
        const spend = rawMetrics.spend;
        const ctr = rawMetrics.impressions > 0 ? (rawMetrics.clicks / rawMetrics.impressions) * 100 : 0;
        const cpa = rawMetrics.conversions > 0 ? spend / rawMetrics.conversions : 0;
        const roas = spend > 0 ? rawMetrics.conversionValue / spend : 0;
        const cvr = rawMetrics.clicks > 0 ? (rawMetrics.conversions / rawMetrics.clicks) * 100 : 0;

        return {
          ...camp,
          type: 'campaign',
          metrics: { ...rawMetrics, ctr, cpa, roas, cvr }
        };
      });

      const analysisRes = await fetch('/api/analysis', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToAnalyze })
      });
      const analysisData = await analysisRes.json();
      
      if (analysisData.error) throw new Error(analysisData.error);

      const generatedAlerts: Alert[] = [];

      analysisData.analyzedItems.forEach((item: any) => {
        const metrics = item.metrics;
        
        if (item.analysis?.decision === 'KILL') {
          generatedAlerts.push({
            id: `kill-${item.id}`,
            type: 'critical',
            campaignId: item.id,
            campaignName: item.name,
            problem: 'Critical Performance Issue',
            cause: item.analysis.problems.join(', ') || 'Extremely poor performance detected.',
            suggestedFix: item.analysis.suggestedAction,
            icon: AlertOctagon,
            metrics
          });
        } else if (item.analysis?.problems?.length > 0) {
          generatedAlerts.push({
            id: `warn-${item.id}`,
            type: 'warning',
            campaignId: item.id,
            campaignName: item.name,
            problem: item.analysis.problems[0],
            cause: `The campaign is experiencing: ${item.analysis.problems.join(', ')}`,
            suggestedFix: item.analysis.suggestedAction,
            icon: TrendingDown,
            metrics
          });
        }

        // Campaign stopped
        if (item.status === 'PAUSED' || item.status === 'ARCHIVED' || item.status === 'OFF') {
          generatedAlerts.push({
            id: `stopped-${item.id}`,
            type: 'info',
            campaignId: item.id,
            campaignName: item.name,
            problem: 'Campaign Stopped',
            cause: 'Campaign was paused manually, ended its schedule, or was stopped by an automated rule.',
            suggestedFix: 'Review final campaign performance to document learnings before permanently archiving, or reactivate if paused by mistake.',
            icon: PauseCircle,
            metrics
          });
        }
      });

      // Sort alerts: Critical first, then Warning, then Info
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      generatedAlerts.sort((a, b) => severityOrder[a.type] - severityOrder[b.type]);

      setAlerts(generatedAlerts);
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
      setError(err.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [user, selectedAccountId, platform, datePreset, getToken]);

  useEffect(() => {
    fetchCampaignsAndGenerateAlerts();
    
    // Set up real-time polling every 60 seconds
    const interval = setInterval(fetchCampaignsAndGenerateAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchCampaignsAndGenerateAlerts]);

  const toggleAlert = (id: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAlerts(newExpanded);
  };

  if (loading && alerts.length === 0) {
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
          <AlertOctagon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error Fetching Alerts</h2>
          <p className="text-red-300 mb-6">{error}</p>
          <button onClick={fetchCampaignsAndGenerateAlerts} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const token = getToken();
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full">
          <Activity className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Not Connected</h2>
          <p className="text-gray-400 mb-6">Connect your {platform === 'meta' ? 'Meta' : platform === 'google' ? 'Google' : 'TikTok'} account to view real-time alerts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Alerts</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time monitoring and automated diagnostics</p>
        </div>
        <button 
          onClick={fetchCampaignsAndGenerateAlerts} 
          className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Bell className="w-4 h-4" />
          Refresh Now
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 glass-panel rounded-2xl text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">All Systems Normal</h2>
          <p className="text-gray-400">Your campaigns are running smoothly. No critical issues detected.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => {
            const isExpanded = expandedAlerts.has(alert.id);
            const Icon = alert.icon;
            
            return (
              <div 
                key={alert.id} 
                className={cn(
                  "glass-panel rounded-2xl overflow-hidden transition-all duration-200 border",
                  alert.type === 'critical' ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 
                  alert.type === 'warning' ? 'border-yellow-500/30' : 'border-blue-500/30'
                )}
              >
                <div 
                  className={cn(
                    "p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors",
                    alert.type === 'critical' ? 'bg-red-500/5' : 
                    alert.type === 'warning' ? 'bg-yellow-500/5' : 'bg-blue-500/5'
                  )}
                  onClick={() => toggleAlert(alert.id)}
                >
                  <div className={cn(
                    "flex-shrink-0 p-2 rounded-xl border shadow-inner",
                    alert.type === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                    alert.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-semibold text-white truncate pr-4">{alert.problem}</h3>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider flex-shrink-0 border shadow-inner",
                        alert.type === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        alert.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      )}>
                        {alert.type}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm truncate">Campaign: {alert.campaignName}</p>
                  </div>
                  
                  <div className="flex-shrink-0 text-gray-500">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 border-t border-white/10 bg-[#0B0F19]/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-[#111827]/50 p-4 rounded-xl border border-white/5 shadow-inner">
                        <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-gray-400" />
                          Root Cause
                        </h4>
                        <p className="text-gray-300 text-sm leading-relaxed">{alert.cause}</p>
                      </div>
                      <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 shadow-inner">
                        <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-400" />
                          Suggested Fix
                        </h4>
                        <p className="text-blue-200 text-sm leading-relaxed">{alert.suggestedFix}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Metrics</h4>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-[#111827]/50 border border-white/5 rounded-xl p-3 text-center shadow-inner">
                          <div className="text-xs text-gray-400 mb-1">Spend</div>
                          <div className="font-semibold text-white">${alert.metrics.spend.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#111827]/50 border border-white/5 rounded-xl p-3 text-center shadow-inner">
                          <div className="text-xs text-gray-400 mb-1">CPA</div>
                          <div className="font-semibold text-white">{alert.metrics.cpa > 0 ? `$${alert.metrics.cpa.toFixed(2)}` : '-'}</div>
                        </div>
                        <div className="bg-[#111827]/50 border border-white/5 rounded-xl p-3 text-center shadow-inner">
                          <div className="text-xs text-gray-400 mb-1">CTR</div>
                          <div className="font-semibold text-white">{alert.metrics.ctr.toFixed(2)}%</div>
                        </div>
                        <div className="bg-[#111827]/50 border border-white/5 rounded-xl p-3 text-center shadow-inner">
                          <div className="text-xs text-gray-400 mb-1">ROAS</div>
                          <div className="font-semibold text-white">{alert.metrics.roas > 0 ? `${alert.metrics.roas.toFixed(2)}x` : '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
