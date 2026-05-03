import React, { useState, useEffect, useCallback } from 'react';
import { FlaskConical, Trophy, ArrowRight, Activity, Sparkles, Loader2, Calendar, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { getAIClient } from '../lib/gemini';
import { usePersistedState } from '../hooks/usePersistedState';

export function TestingEngine() {
  const { user } = useAuth();
  const { selectedAccountId, datePreset, metaToken, googleToken, tiktokToken, platform } = useFilters();
  
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = usePersistedState<any[]>('testing_engine_tests', []);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [testingPlan, setTestingPlan] = usePersistedState<string | null>('testing_engine_plan', null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

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
    const headers = {
      'x-user-id': user!.uid,
      [`x-${platform}-token`]: token
    };

    try {
      const [campRes, adsetRes, adRes, insightRes] = await Promise.all([
        fetch(`/api/campaigns?accountId=${selectedAccountId}&platform=${platform}`, { headers }),
        fetch(`/api/adsets?accountId=${selectedAccountId}&platform=${platform}`, { headers }),
        fetch(`/api/ads?accountId=${selectedAccountId}&platform=${platform}`, { headers }),
        fetch(`/api/insights?accountId=${selectedAccountId}&platform=${platform}&datePreset=${datePreset}`, { headers })
      ]);

      const [campData, adsetData, adData, insightData] = await Promise.all([
        campRes.json(), adsetRes.json(), adRes.json(), insightRes.json()
      ]);

      const campaigns = campData.campaigns || [];
      const adsets = adsetData.adsets || [];
      const ads = adData.ads || [];
      const insights = insightData.insights || [];

      const detectedTests: any[] = [];

      // Detect Audience Tests (Campaigns with multiple Adsets)
      campaigns.forEach((campaign: any) => {
        const campaignAdsets = adsets.filter((a: any) => a.campaignId === campaign.id);
        if (campaignAdsets.length > 1) {
          const variants = campaignAdsets.map((adset: any) => {
            const metrics = insights.find((i: any) => i.id === adset.id)?.metrics || { spend: 0, roas: 0, cpa: 0, ctr: 0 };
            return { id: adset.id, name: adset.name, metrics };
          }).filter((v: any) => v.metrics.spend > 0);

          if (variants.length > 1) {
            const winner = variants.reduce((prev: any, current: any) => {
              // Primary metric: ROAS, secondary: CPA (lower is better if > 0)
              if (prev.metrics.roas !== current.metrics.roas) {
                return prev.metrics.roas > current.metrics.roas ? prev : current;
              }
              if (prev.metrics.cpa > 0 && current.metrics.cpa > 0) {
                return prev.metrics.cpa < current.metrics.cpa ? prev : current;
              }
              return prev.metrics.ctr > current.metrics.ctr ? prev : current;
            });

            detectedTests.push({
              id: `test-aud-${campaign.id}`,
              type: 'Audience Test',
              name: `Audience Test in: ${campaign.name}`,
              variants,
              winner: winner.id
            });
          }
        }
      });

      // Detect Creative Tests (Adsets with multiple Ads)
      adsets.forEach((adset: any) => {
        const adsetAds = ads.filter((a: any) => a.adsetId === adset.id);
        if (adsetAds.length > 1) {
          const variants = adsetAds.map((ad: any) => {
            const metrics = insights.find((i: any) => i.id === ad.id)?.metrics || { spend: 0, roas: 0, cpa: 0, ctr: 0 };
            return { id: ad.id, name: ad.name, metrics };
          }).filter((v: any) => v.metrics.spend > 0);

          if (variants.length > 1) {
            const winner = variants.reduce((prev: any, current: any) => {
              if (prev.metrics.roas !== current.metrics.roas) {
                return prev.metrics.roas > current.metrics.roas ? prev : current;
              }
              if (prev.metrics.cpa > 0 && current.metrics.cpa > 0) {
                return prev.metrics.cpa < current.metrics.cpa ? prev : current;
              }
              return prev.metrics.ctr > current.metrics.ctr ? prev : current;
            });

            detectedTests.push({
              id: `test-cre-${adset.id}`,
              type: 'Creative/Hook Test',
              name: `Creative Test in: ${adset.name}`,
              variants,
              winner: winner.id
            });
          }
        }
      });

      setTests(detectedTests);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedAccountId, platform, datePreset, getToken, setTests]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    try {
      const ai = getAIClient();
      
      const prompt = `You are a senior performance marketing analyst.
Analyze the following active A/B tests and provide a data-driven testing plan for the next cycle.

Active Tests:
${JSON.stringify(tests.map(t => ({
  type: t.type,
  name: t.name,
  variants: t.variants.map((v: any) => ({
    name: v.name,
    spend: v.metrics.spend,
    roas: v.metrics.roas,
    cpa: v.metrics.cpa,
    ctr: v.metrics.ctr
  })),
  winnerId: t.winner
})))}

Provide the output in Markdown format with the following sections:
### 🏆 Current Winners Analysis
### 📉 Losing Variants (Why they failed)
### 🧪 Next Test Hypotheses (3 new things to test based on these results)
### 📋 Implementation Steps
### 🎯 Expected Impact`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are an expert performance marketing analyst. Provide data-driven, actionable advice.",
          temperature: 0.7,
        }
      });

      if (!response.text) throw new Error('No response from AI');
      setTestingPlan(response.text);
    } catch (error: any) {
      console.error('Error generating plan:', error);
      if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('limit')) {
        setTestingPlan(`**Error:** AI request limit reached. Please try again in a few minutes.`);
      } else {
        setTestingPlan(`**Error:** ${error.message || 'Failed to generate plan.'}`);
      }
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleNewTestClick = () => {
    setToast({ message: 'New Test creation flow would open here.', type: 'info' });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
          <p className="text-gray-400 mb-6">Connect your {platform === 'meta' ? 'Meta' : platform === 'google' ? 'Google' : 'TikTok'} account to view tests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Testing Engine</h1>
        <div className="flex gap-3">
          <button 
            onClick={handleNewTestClick}
            className="glass-panel text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <FlaskConical className="w-4 h-4" />
            New Test
          </button>
          <button onClick={fetchAllData} className="glass-panel text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Sync Data
          </button>
          <button 
            onClick={handleGeneratePlan}
            disabled={generatingPlan || tests.length === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
          >
            {generatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            Generate Testing Plan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-400" />
            Detected Tests & Winners
          </h2>
          
          {tests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center glass-panel rounded-2xl">
              <FlaskConical className="w-12 h-12 text-gray-600 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No Active Tests Detected</h2>
              <p className="text-gray-400 mb-6">We couldn't detect any active A/B tests (multiple ads in an adset, or multiple adsets in a campaign) with spend in the selected date range.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {tests.map(test => (
                <div key={test.id} className="glass-panel rounded-2xl p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
                        {test.type}
                      </span>
                      <h3 className="text-lg font-bold text-white">
                        {test.name}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-[#0B0F19] border border-white/10 text-gray-500 text-sm font-bold z-10 shadow-lg">
                      VS
                    </div>
                    
                    {test.variants.map((variant: any) => {
                      const isWinner = variant.id === test.winner;
                      return (
                        <div key={variant.id} className={cn(
                          "p-5 rounded-xl border transition-all",
                          isWinner ? 'border-green-500/50 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-white/5 bg-[#111827]/50'
                        )}>
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-white truncate pr-4" title={variant.name}>{variant.name}</h4>
                            {isWinner && (
                              <Trophy className="w-5 h-5 text-green-400 flex-shrink-0 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-[#0B0F19]/50 p-3 rounded-lg border border-white/5">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">ROAS</div>
                              <div className={cn("font-bold", isWinner ? "text-green-400" : "text-white")}>{variant.metrics.roas > 0 ? `${variant.metrics.roas.toFixed(2)}x` : '-'}</div>
                            </div>
                            <div className="bg-[#0B0F19]/50 p-3 rounded-lg border border-white/5">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">CPA</div>
                              <div className="font-bold text-white">{variant.metrics.cpa > 0 ? `$${variant.metrics.cpa.toFixed(2)}` : '-'}</div>
                            </div>
                            <div className="bg-[#0B0F19]/50 p-3 rounded-lg border border-white/5">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Spend</div>
                              <div className="font-bold text-white">${variant.metrics.spend.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-1">
          <div className="glass-panel rounded-2xl overflow-hidden sticky top-6">
            <div className="p-5 border-b border-white/5 bg-[#111827]/50 flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <Sparkles className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="font-bold text-white">AI Testing Strategy</h2>
            </div>
            <div className="p-6">
              {testingPlan ? (
                <div className="prose prose-sm prose-invert max-w-none text-gray-300" dir="auto">
                  <ReactMarkdown>{testingPlan}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Plan Generated</h3>
                  <p className="text-gray-400 text-sm mb-6">Click "Generate Testing Plan" to analyze your past tests and create a weekly testing cycle.</p>
                  <button 
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan || tests.length === 0}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:shadow-none"
                  >
                    {generatingPlan ? 'Generating...' : 'Generate Plan'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className={cn(
            "px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 border backdrop-blur-md",
            toast.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400" :
            toast.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" :
            "bg-blue-500/10 border-blue-500/20 text-blue-400"
          )}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5" />}
            {toast.type === 'info' && <Activity className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

