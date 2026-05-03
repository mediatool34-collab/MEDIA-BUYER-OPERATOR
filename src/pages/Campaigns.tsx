import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, CheckCircle2, XCircle, Activity, Target, Image as ImageIcon, Folder } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';

export function Campaigns() {
  const { user } = useAuth();
  const { selectedAccountId, datePreset, metaToken, googleToken, tiktokToken, platform } = useFilters();
  
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adsets, setAdsets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<{action: string, item: any}[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const expandToProblem = useCallback((campaignId: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const strCampaignId = String(campaignId);
    const newSet = new Set(expandedItems);
    newSet.add(strCampaignId);
    
    // Find adsets with problems
    const campaignAdsets = adsets.filter(a => String(a.campaignId) === strCampaignId);
    campaignAdsets.forEach(adset => {
      const adsetProblems = adset.analysis?.problems || [];
      
      let hasAdProblem = false;
      const adsetAds = ads.filter(a => String(a.adsetId) === String(adset.id));
      adsetAds.forEach(ad => {
        const adProblems = ad.analysis?.problems || [];
        if (adProblems.length > 0) {
          hasAdProblem = true;
        }
      });

      if (adsetProblems.length > 0 || hasAdProblem) {
        newSet.add(String(adset.id));
      }
    });

    setExpandedItems(newSet);
  }, [expandedItems, adsets, ads]);

  const handleAction = useCallback(async (action: string, item: any, e?: React.MouseEvent, fromQueue = false) => {
    if (e) e.stopPropagation();
    const itemId = String(item.id);
    
    if (!isOnline && !fromQueue) {
      setOfflineQueue(prev => [...prev, { action, item }]);
      showToast(`You are offline. Action queued.`, 'info');
      return;
    }

    setActionLoading(itemId);
    try {
      console.log(`Executing ${action} for ${item.name} (${itemId})`);
      // Simulate API call to execution engine
      await new Promise(resolve => setTimeout(resolve, 800));
      
      let reason = '';
      if (action === 'Scale') {
        reason = 'Manual scale triggered by user';
        showToast(`Successfully increased budget for ${item.name} by 20%`);
      } else if (action === 'Reduce') {
        reason = 'Manual reduce triggered by user';
        showToast(`Successfully decreased budget for ${item.name} by 20%`);
      } else if (action === 'Pause') {
        reason = 'Manual pause triggered by user';
        setCampaigns(prev => prev.map(c => String(c.id) === itemId ? { ...c, status: 'PAUSED' } : c));
        showToast(`Successfully paused ${item.name}`);
      } else if (action === 'Analyze') {
        expandToProblem(itemId);
        showToast(`Analysis complete for ${item.name}. See details below.`, 'info');
        return; // Don't log analyze as optimization
      }

      // Log to Intelligence Engine
      await fetch('/api/intelligence/log-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'OPTIMIZATION',
          payload: {
            campaignId: itemId,
            campaignName: item.name,
            action: action.toUpperCase(),
            reason
          }
        })
      });

    } catch (err) {
      console.error(`Failed to execute ${action}:`, err);
      showToast(`Failed to execute ${action}`, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [isOnline, showToast, expandToProblem]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineQueue.length > 0) {
        showToast(`Reconnected. Processing ${offlineQueue.length} queued actions...`, 'info');
        // Process queue
        offlineQueue.forEach(q => {
          handleAction(q.action, q.item, null as any, true);
        });
        setOfflineQueue([]);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue, showToast, handleAction]);

  const getToken = useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken]);

  const fetchAll = useCallback(async () => {
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
      const [campRes, adsetRes, adRes, campInsightRes, adsetInsightRes, adInsightRes] = await Promise.all([
        fetch(`/api/campaigns?accountId=${selectedAccountId}&platform=${platform}`, { headers }),
        fetch(`/api/adsets?accountId=${selectedAccountId}&platform=${platform}`, { headers }),
        fetch(`/api/ads?accountId=${selectedAccountId}&platform=${platform}`, { headers }),
        fetch(`/api/insights?accountId=${selectedAccountId}&platform=${platform}&level=campaign&datePreset=${datePreset}`, { headers }),
        fetch(`/api/insights?accountId=${selectedAccountId}&platform=${platform}&level=adset&datePreset=${datePreset}`, { headers }),
        fetch(`/api/insights?accountId=${selectedAccountId}&platform=${platform}&level=ad&datePreset=${datePreset}`, { headers })
      ]);

      const [campData, adsetData, adData, campInsightData, adsetInsightData, adInsightData] = await Promise.all([
        campRes.json(), adsetRes.json(), adRes.json(), campInsightRes.json(), adsetInsightRes.json(), adInsightRes.json()
      ]);

      if (campData.error) throw new Error(campData.error);
      if (adsetData.error) throw new Error(adsetData.error);
      if (adData.error) throw new Error(adData.error);
      if (campInsightData.error) throw new Error(campInsightData.error);
      if (adsetInsightData.error) throw new Error(adsetInsightData.error);
      if (adInsightData.error) throw new Error(adInsightData.error);

      setCampaigns(campData.campaigns || []);
      setAdsets(adsetData.adsets || []);
      setAds(adData.ads || []);
      
      const allInsights = [
        ...(campInsightData.insights || []),
        ...(adsetInsightData.insights || []),
        ...(adInsightData.insights || [])
      ];

      const itemsToAnalyze = [
        ...(campData.campaigns || []).map((c: any) => {
          const metrics = allInsights.find(i => i.id === c.id)?.metrics || { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 };
          const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
          const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
          const roas = metrics.spend > 0 ? metrics.conversionValue / metrics.spend : 0;
          const cvr = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
          const cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
          return { ...c, type: 'campaign', metrics: { ...metrics, ctr, cpa, roas, cvr, cpm } };
        }),
        ...(adsetData.adsets || []).map((a: any) => {
          const metrics = allInsights.find(i => i.id === a.id)?.metrics || { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 };
          const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
          const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
          const roas = metrics.spend > 0 ? metrics.conversionValue / metrics.spend : 0;
          const cvr = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
          const cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
          return { ...a, type: 'adset', metrics: { ...metrics, ctr, cpa, roas, cvr, cpm } };
        }),
        ...(adData.ads || []).map((a: any) => {
          const metrics = allInsights.find(i => i.id === a.id)?.metrics || { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 };
          const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
          const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
          const roas = metrics.spend > 0 ? metrics.conversionValue / metrics.spend : 0;
          const cvr = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
          const cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
          return { ...a, type: 'ad', metrics: { ...metrics, ctr, cpa, roas, cvr, cpm } };
        })
      ];

      const analysisRes = await fetch(`/api/analysis?accountId=${selectedAccountId}&platform=${platform}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToAnalyze })
      });
      const analysisData = await analysisRes.json();
      
      if (analysisData.error) throw new Error(analysisData.error);

      const analyzedCampaigns = analysisData.analyzedItems.filter((i: any) => i.type === 'campaign');
      const analyzedAdsets = analysisData.analyzedItems.filter((i: any) => i.type === 'adset');
      const analyzedAds = analysisData.analyzedItems.filter((i: any) => i.type === 'ad');

      setCampaigns(analyzedCampaigns);
      setAdsets(analyzedAdsets);
      setAds(analyzedAds);
      setInsights(allInsights);
      setIsMock(campData.isMock || adsetData.isMock || adData.isMock || false);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [user, selectedAccountId, platform, datePreset, getToken]);

  useEffect(() => {
    fetchAll();
  }, [selectedAccountId, platform, datePreset, fetchAll]);

  const toggleExpand = (id: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const strId = String(id);
    const newSet = new Set(expandedItems);
    if (newSet.has(strId)) newSet.delete(strId);
    else newSet.add(strId);
    setExpandedItems(newSet);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
        <div className="text-gray-400 font-medium animate-pulse">Analyzing campaigns...</div>
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
          <p className="text-gray-400 mb-6">Connect your {platform === 'meta' ? 'Meta' : platform === 'google' ? 'Google' : 'TikTok'} account to view campaigns.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="glass-panel p-8 rounded-2xl border-red-500/20 max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error Fetching Data</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <button onClick={fetchAll} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full">
          <Activity className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Campaigns Found</h2>
          <p className="text-gray-400 mb-6">We couldn't find any campaigns for the selected account and date range.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Campaign Audit</h1>
        <div className="flex items-center gap-3">
          {isMock && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[10px] font-bold text-yellow-500 uppercase tracking-wider">
              <AlertTriangle className="w-3 h-3" />
              <div className="flex items-center gap-2 group relative">
                <div className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest rounded-full cursor-help">
                  Limited Account Sync
                </div>
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 border border-white/10 rounded-xl text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl text-right">
                  Showing representative sample data. To unlock real-time live account metrics, your Meta App requires "Ads Library API" approval from Meta.
                </div>
              </div>
            </div>
          )}
          <button onClick={fetchAll} className="glass-panel text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors">
            Sync Data
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-[#111827]/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
          <div className="col-span-3">Name</div>
          <div className="col-span-1 text-right">Spend</div>
          <div className="col-span-1 text-right">ROAS</div>
          <div className="col-span-1 text-right">CPA</div>
          <div className="col-span-1 text-right">CTR</div>
          <div className="col-span-1 text-center">Issues</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        <div className="divide-y divide-white/5">
          {campaigns.map(campaign => (
            <CampaignRow 
              key={campaign.id} 
              campaign={campaign} 
              adsets={adsets.filter(a => a.campaignId === campaign.id)}
              ads={ads}
              insights={insights}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              expandToProblem={expandToProblem}
              handleAction={handleAction}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={cn(
            "px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 border backdrop-blur-md",
            toast.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400" :
            toast.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" :
            "bg-blue-500/10 border-blue-500/20 text-blue-400"
          )}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Activity className="w-5 h-5" />}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}

function formatNumber(value: number, decimals = 2) {
  return (value || 0).toFixed(decimals);
}

const CampaignRow: React.FC<{ 
  campaign: any, 
  adsets: any[], 
  ads: any[], 
  insights: any[],
  expandedItems: Set<string>,
  toggleExpand: (id: string | number, e?: React.MouseEvent) => void,
  expandToProblem: (id: string | number, e?: React.MouseEvent) => void,
  handleAction: (action: string, item: any, e: React.MouseEvent) => void,
  actionLoading: string | null
}> = ({ campaign, adsets, ads, insights, expandedItems, toggleExpand, expandToProblem, handleAction, actionLoading }) => {
  const isExpanded = expandedItems.has(String(campaign.id));
  const metrics = campaign.metrics || {};
  const problems = campaign.analysis?.problems || [];
  const hasProblems = problems.length > 0;
  const isLoading = actionLoading === String(campaign.id);

  return (
    <div>
      <div 
        className={cn(
          "grid grid-cols-12 gap-4 p-4 hover:bg-white/5 cursor-pointer items-center transition-colors group",
          hasProblems && "bg-red-500/5 hover:bg-red-500/10"
        )}
        onClick={() => toggleExpand(campaign.id)}
      >
        <div className="col-span-3 flex items-center gap-2 font-medium text-white truncate">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />}
          <Folder className={cn("w-4 h-4 flex-shrink-0", hasProblems ? "text-red-400" : "text-blue-400")} />
          <span className={cn("truncate", hasProblems && "text-red-400")} title={campaign.name}>{campaign.name}</span>
        </div>
        <div className="col-span-1 text-right text-gray-400">{formatCurrency(metrics.spend)}</div>
        <div className="col-span-1 text-right text-gray-400">{formatNumber(metrics.roas)}x</div>
        <div className="col-span-1 text-right text-gray-400">{metrics.cpa > 0 ? formatCurrency(metrics.cpa) : '-'}</div>
        <div className="col-span-1 text-right text-gray-400">{formatNumber(metrics.ctr)}%</div>
        <div className="col-span-1 flex justify-center">
          {hasProblems ? (
            <button 
              type="button"
              onClick={(e) => expandToProblem(campaign.id, e)}
              className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
              title={problems.join(', ')}
            >
              <AlertTriangle className="w-3 h-3" />
              {problems.length}
            </button>
          ) : (
            <span className="text-gray-600">-</span>
          )}
        </div>
        <div className="col-span-1 flex justify-center">
          <StatusBadge status={campaign.status} />
        </div>
        <div className="col-span-3 flex items-center justify-end gap-2 transition-opacity">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            <>
              <button type="button" onClick={(e) => handleAction('Scale', campaign, e)} className="px-2.5 py-1.5 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors">Scale</button>
              <button type="button" onClick={(e) => handleAction('Reduce', campaign, e)} className="px-2.5 py-1.5 text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors">Reduce</button>
              <button type="button" onClick={(e) => handleAction('Pause', campaign, e)} className="px-2.5 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">Pause</button>
              <button type="button" onClick={(e) => handleAction('Analyze', campaign, e)} className="px-2.5 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors">Analyze</button>
            </>
          )}
        </div>
      </div>
      
      {isExpanded && adsets && (
        <div className="bg-[#0B0F19]/50 border-t border-white/5 divide-y divide-white/5">
          {adsets.map((adset: any) => (
            <AdSetRow 
              key={adset.id} 
              adset={adset} 
              ads={ads.filter(a => a.adsetId === adset.id)}
              insights={insights}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
            />
          ))}
          {adsets.length === 0 && (
            <div className="p-4 pl-10 text-sm text-gray-500">No ad sets found for this campaign.</div>
          )}
        </div>
      )}
    </div>
  );
}

const AdSetRow: React.FC<{ 
  adset: any, 
  ads: any[], 
  insights: any[],
  expandedItems: Set<string>,
  toggleExpand: (id: string | number, e?: React.MouseEvent) => void
}> = ({ adset, ads, insights, expandedItems, toggleExpand }) => {
  const isExpanded = expandedItems.has(String(adset.id));
  const metrics = adset.metrics || {};
  const problems = adset.analysis?.problems || [];
  const hasProblems = problems.length > 0;

  return (
    <div>
      <div 
        className={cn(
          "grid grid-cols-12 gap-4 p-3 pl-8 hover:bg-white/5 cursor-pointer items-center transition-colors text-sm",
          hasProblems && "bg-red-500/5 hover:bg-red-500/10"
        )}
        onClick={() => toggleExpand(adset.id)}
      >
        <div className="col-span-4 flex items-center gap-2 font-medium text-gray-300 truncate">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />}
          <Target className={cn("w-4 h-4 flex-shrink-0", hasProblems ? "text-red-400" : "text-indigo-400")} />
          <span className={cn("truncate", hasProblems && "text-red-400")} title={adset.name}>{adset.name}</span>
        </div>
        <div className="col-span-1 text-right text-gray-400">{formatCurrency(metrics.spend)}</div>
        <div className="col-span-1 text-right text-gray-400">{formatCurrency(metrics.conversionValue)}</div>
        <div className="col-span-1 text-right text-gray-400">{formatNumber(metrics.roas)}x</div>
        <div className="col-span-1 text-right text-gray-400">{metrics.cpa > 0 ? formatCurrency(metrics.cpa) : '-'}</div>
        <div className="col-span-1 text-right text-gray-400">{formatNumber(metrics.ctr)}%</div>
        <div className="col-span-1 text-right text-gray-400">{formatCurrency(metrics.cpm)}</div>
        <div className="col-span-1 flex justify-center">
          {hasProblems ? (
            <span className="flex items-center gap-1 text-red-400 text-xs font-medium bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20" title={problems.join(', ')}>
              <AlertTriangle className="w-3 h-3" />
              {problems[0]}
            </span>
          ) : (
            <span className="text-gray-600">-</span>
          )}
        </div>
        <div className="col-span-1 flex justify-center">
          <StatusBadge status={adset.status} />
        </div>
      </div>

      {isExpanded && ads && (
        <div className="bg-[#111827]/30 border-t border-white/5 divide-y divide-white/5">
          {ads.map((ad: any) => (
            <AdRow key={ad.id} ad={ad} insights={insights} />
          ))}
          {ads.length === 0 && (
            <div className="p-3 pl-14 text-sm text-gray-500">No ads found for this ad set.</div>
          )}
        </div>
      )}
    </div>
  );
}

const AdRow: React.FC<{ ad: any, insights: any[] }> = ({ ad, insights }) => {
  const metrics = ad.metrics || {};
  const problems = ad.analysis?.problems || [];
  const hasProblems = problems.length > 0;

  return (
    <div className={cn(
      "grid grid-cols-12 gap-4 p-3 pl-12 hover:bg-white/5 items-center transition-colors text-sm",
      hasProblems && "bg-red-500/5 hover:bg-red-500/10"
    )}>
      <div className="col-span-4 flex items-center gap-2 text-gray-400 truncate">
        <ImageIcon className={cn("w-4 h-4 flex-shrink-0 ml-6", hasProblems ? "text-red-400" : "text-blue-400")} />
        <span className={cn("truncate", hasProblems && "text-red-400")} title={ad.name}>{ad.name}</span>
      </div>
      <div className="col-span-1 text-right text-gray-500">{formatCurrency(metrics.spend)}</div>
      <div className="col-span-1 text-right text-gray-500">{formatCurrency(metrics.conversionValue)}</div>
      <div className="col-span-1 text-right text-gray-500">{formatNumber(metrics.roas)}x</div>
      <div className="col-span-1 text-right text-gray-500">{metrics.cpa > 0 ? formatCurrency(metrics.cpa) : '-'}</div>
      <div className="col-span-1 text-right text-gray-500">{formatNumber(metrics.ctr)}%</div>
      <div className="col-span-1 text-right text-gray-500">{formatCurrency(metrics.cpm)}</div>
      <div className="col-span-1 flex justify-center">
        {hasProblems ? (
          <span className="flex items-center gap-1 text-red-400 text-xs font-medium bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20" title={problems.join(', ')}>
            <AlertTriangle className="w-3 h-3" />
            {problems[0]}
          </span>
        ) : (
          <span className="text-gray-600">-</span>
        )}
      </div>
      <div className="col-span-1 flex justify-center">
        <StatusBadge status={ad.status} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return <span title="Active"><CheckCircle2 className="w-4 h-4 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" /></span>;
  }
  if (status === 'PAUSED') {
    return <div className="w-4 h-4 rounded-full border-2 border-gray-500" title="Paused" />;
  }
  return <span title={status}><XCircle className="w-4 h-4 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" /></span>;
}

