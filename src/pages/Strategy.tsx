import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Activity, Loader2, TrendingUp, Target, AlertOctagon, PieChart, Lightbulb, Zap } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { getAIClient } from '../lib/gemini';
import { usePersistedState } from '../hooks/usePersistedState';

export function Strategy() {
  const { user } = useAuth();
  const { selectedAccountId, datePreset, metaToken, googleToken, tiktokToken, platform } = useFilters();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [strategy, setStrategy] = usePersistedState<string | null>('strategy_content', null);
  const [campaignData, setCampaignData] = usePersistedState<any[]>('strategy_campaign_data', []);

  const getToken = useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken]);

  const fetchAllData = useCallback(async () => {
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

      const aggregated = campaigns.map((camp: any) => {
        const campInsight = insights.find((i: any) => i.id === camp.id);
        const metrics = campInsight?.metrics || { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 };
        
        const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
        const roas = metrics.spend > 0 ? metrics.conversionValue / metrics.spend : 0;
        const cvr = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;

        return {
          id: camp.id,
          name: camp.name,
          status: camp.status,
          type: 'campaign',
          metrics: { ...metrics, ctr, cpa, roas, cvr }
        };
      }).filter((c: any) => c.metrics.spend > 0);

      const analysisRes = await fetch('/api/analysis', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: aggregated })
      });
      const analysisData = await analysisRes.json();
      
      if (analysisData.error) throw new Error(analysisData.error);

      const analyzedCampaigns = analysisData.analyzedItems;
      analyzedCampaigns.sort((a: any, b: any) => b.metrics.spend - a.metrics.spend);
      setCampaignData(analyzedCampaigns);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [user, selectedAccountId, platform, datePreset, getToken, setCampaignData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleGenerateStrategy = async () => {
    setGenerating(true);
    try {
      const ai = getAIClient();
      
      const prompt = `You are a senior performance marketing strategist.
Analyze the following campaign performance data and provide a comprehensive strategy for the next 30 days.

Campaign Data:
${JSON.stringify(campaignData.map(c => ({
  name: c.name,
  spend: c.metrics.spend,
  roas: c.metrics.roas,
  cpa: c.metrics.cpa,
  ctr: c.metrics.ctr,
  cvr: c.metrics.cvr,
  classification: c.classification,
  explanation: c.explanation
})))}

Provide the output in Markdown format with the following sections:
### 📊 Performance Overview
### 🚀 Scaling Opportunities (Which campaigns to increase budget on and why)
### 🛠 Optimization Tasks (Which campaigns to fix or kill)
### 💡 Creative & Targeting Recommendations
### 📅 30-Day Roadmap`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are an expert performance marketing strategist. Provide data-driven, actionable advice.",
          temperature: 0.7,
        }
      });

      if (!response.text) throw new Error('No response from AI');
      setStrategy(response.text);
    } catch (error: any) {
      console.error('Error generating strategy:', error);
      if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('limit')) {
        setStrategy(`**Error:** AI request limit reached. Please try again in a few minutes.`);
      } else {
        setStrategy(`**Error:** ${error.message || 'Failed to generate strategy.'}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
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
          <h2 className="text-2xl font-bold text-white mb-2">Error Fetching Data</h2>
          <p className="text-red-300 mb-6">{error}</p>
          <button onClick={fetchAllData} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
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
          <p className="text-gray-400 mb-6">Connect your {platform === 'meta' ? 'Meta' : platform === 'google' ? 'Google' : 'TikTok'} account to generate a strategy.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketing Strategy</h1>
          <p className="text-gray-400 text-sm mt-1">Data-driven scaling, killing, and creative plans</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchAllData} className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2 shadow-sm">
            <Activity className="w-4 h-4" />
            Sync Data
          </button>
          <button 
            onClick={handleGenerateStrategy}
            disabled={generating || campaignData.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
            Generate Strategy
          </button>
        </div>
      </div>

      {campaignData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center glass-panel rounded-2xl">
          <Activity className="w-12 h-12 text-gray-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Active Campaigns</h2>
          <p className="text-gray-400 mb-6">We couldn't find any campaigns with spend in the selected date range.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-[#0B0F19]/50">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  Analyzed Campaigns
                </h2>
              </div>
              <div className="p-0 max-h-[600px] overflow-y-auto custom-scrollbar">
                <ul className="divide-y divide-white/5">
                  {campaignData.map((camp) => (
                    <li key={camp.id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-sm font-medium text-white line-clamp-2 pr-2">{camp.name}</h3>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider flex-shrink-0 border shadow-inner",
                          camp.status === 'ACTIVE' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        )}>
                          {camp.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="bg-[#111827]/50 p-2 rounded-lg border border-white/5 shadow-inner">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Spend</p>
                          <p className="text-sm font-semibold text-white">${camp.metrics.spend.toFixed(2)}</p>
                        </div>
                        <div className="bg-[#111827]/50 p-2 rounded-lg border border-white/5 shadow-inner">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">ROAS</p>
                          <p className="text-sm font-semibold text-white">{camp.metrics.roas > 0 ? `${camp.metrics.roas.toFixed(2)}x` : '-'}</p>
                        </div>
                        <div className="bg-[#111827]/50 p-2 rounded-lg border border-white/5 shadow-inner">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">CPA</p>
                          <p className="text-sm font-semibold text-white">{camp.metrics.cpa > 0 ? `$${camp.metrics.cpa.toFixed(2)}` : '-'}</p>
                        </div>
                        <div className="bg-[#111827]/50 p-2 rounded-lg border border-white/5 shadow-inner">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">CTR</p>
                          <p className="text-sm font-semibold text-white">{camp.metrics.ctr.toFixed(2)}%</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="glass-panel rounded-2xl overflow-hidden min-h-[600px] flex flex-col">
              <div className="p-4 border-b border-white/10 bg-[#0B0F19]/50 flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="font-semibold text-white">AI Strategy Report</h2>
              </div>
              <div className="p-6 flex-1">
                {strategy ? (
                  <div className="prose prose-sm prose-invert max-w-none text-gray-300 prose-headings:text-white prose-a:text-blue-400" dir="auto">
                    <ReactMarkdown>{strategy}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-20">
                    <div className="p-4 bg-white/5 rounded-full border border-white/10 mb-6 shadow-inner">
                      <Lightbulb className="w-12 h-12 text-amber-400/80" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Ready to Generate</h3>
                    <p className="text-gray-400 max-w-md mx-auto mb-8">
                      Click the button below to analyze your {campaignData.length} active campaigns and generate a comprehensive scaling, killing, and creative strategy.
                    </p>
                    <button 
                      onClick={handleGenerateStrategy}
                      disabled={generating}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-500 transition-all duration-200 disabled:opacity-50 inline-flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]"
                    >
                      {generating ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Data...</>
                      ) : (
                        <><Sparkles className="w-5 h-5 text-amber-400" /> Generate Strategy Report</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
