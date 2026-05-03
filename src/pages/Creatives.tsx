import React, { useState, useEffect, useCallback } from 'react';
import { Play, Image as ImageIcon, Sparkles, TrendingUp, AlertCircle, Activity, Loader2, CheckCircle2, XCircle, MinusCircle, Zap } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { getAIClient } from '../lib/gemini';
import { usePersistedState } from '../hooks/usePersistedState';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}

export function Creatives() {
  const { user } = useAuth();
  const { selectedAccountId, datePreset, metaToken, googleToken, tiktokToken, platform } = useFilters();
  const [creatives, setCreatives] = usePersistedState<any[]>('creatives_list', []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedConcepts, setGeneratedConcepts] = usePersistedState<Record<string, string>>('creative_concepts', {});

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
      const [adRes, insightRes, creativeRes] = await Promise.all([
        fetch(`/api/ads?accountId=${selectedAccountId}&platform=${platform}`, { headers }),
        fetch(`/api/insights?accountId=${selectedAccountId}&platform=${platform}&level=ad&datePreset=${datePreset}`, { headers }),
        fetch(`/api/creatives?accountId=${selectedAccountId}&platform=${platform}`, { headers })
      ]);

      const [adData, insightData, creativeData] = await Promise.all([
        adRes.json(), insightRes.json(), creativeRes.json()
      ]);

      if (adData.error) throw new Error(adData.error);
      if (insightData.error) throw new Error(insightData.error);
      if (creativeData.error) throw new Error(creativeData.error);

      const ads = adData.ads || [];
      const insights = insightData.insights || [];
      const fetchedCreatives = creativeData.creatives || [];

      // Group by creative
      const creativeMap = new Map();
      
      // First, add all fetched creatives
      fetchedCreatives.forEach((c: any) => {
        creativeMap.set(c.id, {
          id: c.id,
          name: c.name,
          imageUrl: c.imageUrl || 'https://picsum.photos/seed/ad/400/600',
          body: c.body || '',
          platform: c.platform,
          ads: []
        });
      });

      ads.forEach((ad: any) => {
        const creativeId = ad.creative?.id || ad.id; // fallback to ad id
        if (!creativeMap.has(creativeId)) {
          creativeMap.set(creativeId, {
            id: creativeId,
            name: ad.creative?.name || ad.name,
            imageUrl: ad.creative?.imageUrl || 'https://picsum.photos/seed/ad/400/600',
            body: ad.creative?.body || '',
            platform: ad.platform,
            ads: []
          });
        }
        creativeMap.get(creativeId).ads.push(ad);
      });

      const aggregatedCreatives = Array.from(creativeMap.values()).map(creative => {
        let spend = 0, impressions = 0, clicks = 0, conversions = 0, conversionValue = 0;
        
        creative.ads.forEach((ad: any) => {
          const adInsight = insights.find((i: any) => i.id === ad.id);
          if (adInsight && adInsight.metrics) {
            spend += adInsight.metrics.spend || 0;
            impressions += adInsight.metrics.impressions || 0;
            clicks += adInsight.metrics.clicks || 0;
            conversions += adInsight.metrics.conversions || 0;
            conversionValue += adInsight.metrics.conversionValue || 0;
          }
        });

        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpa = conversions > 0 ? spend / conversions : 0;
        const roas = spend > 0 ? conversionValue / spend : 0;
        const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;

        return {
          ...creative,
          type: 'creative',
          metrics: { spend, impressions, clicks, conversions, conversionValue, ctr, cpa, roas, cvr }
        };
      });

      const analysisRes = await fetch('/api/analysis', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: aggregatedCreatives })
      });
      const analysisData = await analysisRes.json();
      
      if (analysisData.error) throw new Error(analysisData.error);

      const analyzedCreatives = analysisData.analyzedItems.map((item: any) => {
        let classification = 'Average';
        if (item.analysis?.creativeClassification === 'WINNER') classification = 'Winning';
        if (item.analysis?.creativeClassification === 'LOSER' || item.analysis?.creativeClassification === 'FATIGUED') classification = 'Poor';
        
        return {
          ...item,
          classification,
          explanation: item.analysis?.suggestedAction || 'Performance is stable but has room for optimization.'
        };
      });

      // Sort by spend descending
      analyzedCreatives.sort((a: any, b: any) => b.metrics.spend - a.metrics.spend);

      setCreatives(analyzedCreatives);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [user, selectedAccountId, platform, datePreset, getToken, setCreatives]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleGenerateConcepts = async (creative: any) => {
    setGeneratingFor(creative.id);
    try {
      const ai = getAIClient();
      
      const prompt = `Analyze this ad creative and its performance metrics.
Creative Name: ${creative.name}
Primary Text: ${creative.body}
Metrics:
- Spend: $${creative.metrics.spend.toFixed(2)}
- ROAS: ${creative.metrics.roas.toFixed(2)}x
- CPA: $${creative.metrics.cpa.toFixed(2)}
- CTR: ${creative.metrics.ctr.toFixed(2)}%
- Conversion Rate: ${creative.metrics.cvr.toFixed(2)}%
Current Classification: ${creative.classification}
Reason: ${creative.explanation}

Based on this data, generate an improved creative strategy.
Provide the output in Markdown format with the following sections:
### 🎣 New Hooks (3 ideas to grab attention)
### 📐 New Angles (2 psychological angles to test)
### 📝 New Script / Ad Copy (1 complete, improved primary text)
### 🎨 Visual Ideas (2 concepts for the image/video)`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are an expert direct-response copywriter and creative strategist. Provide actionable, high-converting creative concepts.",
          temperature: 0.8,
        }
      });

      if (!response.text) throw new Error('No response from AI');
      setGeneratedConcepts(prev => ({ ...prev, [creative.id]: response.text }));
    } catch (error: any) {
      console.error('Error generating concepts:', error);
      if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('limit')) {
        setGeneratedConcepts(prev => ({ ...prev, [creative.id]: `**Error:** AI request limit reached. Please try again in a few minutes.` }));
      } else {
        setGeneratedConcepts(prev => ({ ...prev, [creative.id]: `**Error:** ${error.message || 'Failed to generate concepts.'}` }));
      }
    } finally {
      setGeneratingFor(null);
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
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error Fetching Data</h2>
          <p className="text-red-300 mb-6">{error}</p>
          <button onClick={fetchAll} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
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
          <p className="text-gray-400 mb-6">Connect your {platform === 'meta' ? 'Meta' : platform === 'google' ? 'Google' : 'TikTok'} account to view creatives.</p>
        </div>
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full">
          <Activity className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Creatives Found</h2>
          <p className="text-gray-400 mb-6">We couldn't find any creatives for the selected account and date range.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Creative Intelligence</h1>
        <button onClick={fetchAll} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
          Sync Data
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {creatives.map(creative => {
          const { spend, roas, cpa, ctr, cvr } = creative.metrics;
          const isWinning = creative.classification === 'Winning';
          const isPoor = creative.classification === 'Poor';

          return (
            <div key={creative.id} className="glass-panel rounded-2xl overflow-hidden flex flex-col">
              <div className="flex flex-col md:flex-row">
                <div 
                  className="w-full md:w-48 h-64 md:h-auto bg-[#0B0F19] relative flex-shrink-0 cursor-pointer group border-r border-white/5"
                  onClick={() => window.open(creative.imageUrl, '_blank')}
                >
                  <img 
                    src={creative.imageUrl} 
                    alt={creative.name} 
                    className="w-full h-full object-cover transition-opacity group-hover:opacity-80" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/ad/400/600';
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 backdrop-blur-md border border-white/10">
                    <ImageIcon className="w-3 h-3" />
                    IMAGE
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 backdrop-blur-md border border-white/20">
                      View Full Size
                    </div>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-white line-clamp-2 pr-2">{creative.name}</h3>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex-shrink-0 border shadow-inner",
                      isWinning ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                      isPoor ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    )}>
                      {isWinning && <CheckCircle2 className="w-3 h-3" />}
                      {isPoor && <XCircle className="w-3 h-3" />}
                      {!isWinning && !isPoor && <MinusCircle className="w-3 h-3" />}
                      {creative.classification}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-[#111827]/50 p-3 rounded-xl border border-white/5 shadow-inner">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">ROAS</div>
                      <div className="text-lg font-bold text-white">{roas > 0 ? `${roas.toFixed(2)}x` : '-'}</div>
                    </div>
                    <div className="bg-[#111827]/50 p-3 rounded-xl border border-white/5 shadow-inner">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">CTR</div>
                      <div className="text-lg font-bold text-white">{ctr.toFixed(2)}%</div>
                    </div>
                    <div className="bg-[#111827]/50 p-3 rounded-xl border border-white/5 shadow-inner">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">CPA</div>
                      <div className="text-lg font-bold text-white">{cpa > 0 ? formatCurrency(cpa) : '-'}</div>
                    </div>
                    <div className="bg-[#111827]/50 p-3 rounded-xl border border-white/5 shadow-inner">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">CVR</div>
                      <div className="text-lg font-bold text-white">{cvr.toFixed(2)}%</div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className={cn(
                      "text-sm p-4 rounded-xl mb-4 border shadow-inner",
                      isWinning ? "bg-green-500/5 text-green-300 border-green-500/10" : 
                      isPoor ? "bg-red-500/5 text-red-300 border-red-500/10" : 
                      "bg-yellow-500/5 text-yellow-300 border-yellow-500/10"
                    )}>
                      <span className="font-bold opacity-80">Analysis:</span> {creative.explanation}
                    </div>
                    <button 
                      onClick={() => handleGenerateConcepts(creative)}
                      disabled={generatingFor === creative.id}
                      className="w-full bg-white/5 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 border border-white/10 shadow-sm"
                    >
                      {generatingFor === creative.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating Strategy...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 text-amber-400" /> Generate Improved Creative</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Generated Concepts Section */}
              {generatedConcepts[creative.id] && (
                <div className="border-t border-white/10 bg-[#0B0F19]/50 p-6">
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                    </div>
                    AI Generated Creative Strategy
                  </h4>
                  <div className="prose prose-sm prose-invert max-w-none text-gray-300 prose-headings:text-white prose-a:text-blue-400" dir="auto">
                    <ReactMarkdown>{generatedConcepts[creative.id]}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

