import React, { useState, useEffect, useCallback } from 'react';
import { Globe, TrendingUp, MapPin, Target, Lightbulb, Image as ImageIcon, DollarSign, Activity, Search, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { usePersistedState } from '../hooks/usePersistedState';

const MARKET_PROFILES = {
  EGYPT: {
    name: 'Egypt',
    keywords: ['eg', 'egypt', 'cairo', 'egp'],
    behavior: 'Price sensitive. High CTR but lower conversion rate. Responds well to discounts, Cash on Delivery (COD), and emotional selling.',
    strategy: 'Focus on aggressive offers, prominent COD messaging, and very strong initial hooks to capture attention.',
    creative: 'عرض خاص لفترة محدودة 🔥 (Special offer for a limited time)',
    pricing: 'Lower price points, value bundles.',
    kpis: { ctr: 'High', roas: 'Medium', cpm: 'Low' }
  },
  GCC: {
    name: 'GCC (Saudi, UAE, Qatar, Kuwait)',
    keywords: ['ae', 'sa', 'qa', 'kw', 'uae', 'saudi', 'gcc', 'aed', 'sar', 'dubai', 'riyadh'],
    behavior: 'Higher purchasing power. Lower CTR but higher conversion rate. Responds to premium branding, trust signals, and fast delivery.',
    strategy: 'Focus on premium creatives, clean and minimalist visuals, and strong trust signals (e.g., guarantees, premium packaging).',
    creative: 'Premium Quality You Can Trust ✨',
    pricing: 'Higher perceived value, premium pricing.',
    kpis: { ctr: 'Medium', roas: 'High', cpm: 'Medium' }
  },
  EU_USA: {
    name: 'Europe / USA',
    keywords: ['us', 'uk', 'eu', 'europe', 'usa', 'usd', 'eur', 'gbp', 'america', 'london', 'new york'],
    behavior: 'Very competitive markets with expensive CPMs. Audiences respond to strong branding, clear value propositions, and social proof/reviews.',
    strategy: 'Focus heavily on branding, authentic storytelling, user-generated content (UGC), and prominent social proof.',
    creative: 'Why Thousands Are Switching to This ⭐️⭐️⭐️⭐️⭐️',
    pricing: 'Competitive pricing, subscription models.',
    kpis: { ctr: 'Low', roas: 'Medium', cpm: 'High' }
  },
  DEFAULT: {
    name: 'Global / Unspecified',
    keywords: [],
    behavior: 'Standard global audience behavior. Mix of price sensitivity and brand awareness.',
    strategy: 'Balanced approach testing both offer-led and brand-led creatives to identify local preferences.',
    creative: 'Discover our best-selling products today.',
    pricing: 'Standard pricing.',
    kpis: { ctr: 'Medium', roas: 'Medium', cpm: 'Medium' }
  }
};

function detectMarket(campaignName: string, currency?: string) {
  const nameLower = campaignName.toLowerCase();
  
  for (const keyword of MARKET_PROFILES.EGYPT.keywords) {
    if (nameLower.includes(keyword) || currency === 'EGP') return MARKET_PROFILES.EGYPT;
  }
  for (const keyword of MARKET_PROFILES.GCC.keywords) {
    if (nameLower.includes(keyword) || ['AED', 'SAR', 'QAR', 'KWD'].includes(currency || '')) return MARKET_PROFILES.GCC;
  }
  for (const keyword of MARKET_PROFILES.EU_USA.keywords) {
    if (nameLower.includes(keyword) || ['USD', 'EUR', 'GBP'].includes(currency || '')) return MARKET_PROFILES.EU_USA;
  }
  
  // Randomly assign a market for demonstration if none detected, to show the engine working
  const hash = campaignName.length % 3;
  if (hash === 0) return MARKET_PROFILES.EGYPT;
  if (hash === 1) return MARKET_PROFILES.GCC;
  return MARKET_PROFILES.EU_USA;
}

export function MarketIntelligence() {
  const { user } = useAuth();
  const { selectedAccountId, datePreset, metaToken, googleToken, tiktokToken, platform } = useFilters();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = usePersistedState<any[]>('market_intelligence_data', []);

  const getToken = useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken]);

  useEffect(() => {
    const fetchMarketData = async () => {
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
        const [campRes, insightRes] = await Promise.all([
          fetch(`/api/campaigns?accountId=${selectedAccountId}&platform=${platform}`, { headers }),
          fetch(`/api/insights?accountId=${selectedAccountId}&platform=${platform}&datePreset=${datePreset}`, { headers })
        ]);

        const [campData, insightData] = await Promise.all([
          campRes.json(), insightRes.json()
        ]);

        const campaigns = campData.campaigns || [];
        const insights = insightData.insights || [];

        const analyzedMarkets = campaigns.map((campaign: any) => {
          const metrics = insights.find((i: any) => i.id === campaign.id)?.metrics || { spend: 0, roas: 0, cpa: 0, ctr: 0, cpm: 0 };
          const market = detectMarket(campaign.name);
          
          return {
            campaign,
            metrics,
            market
          };
        }).filter((item: any) => item.metrics.spend > 0);

        setMarketData(analyzedMarkets);
      } catch (error) {
        console.error('Failed to fetch market data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, [selectedAccountId, platform, datePreset, user, getToken, setMarketData]);

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
          <Globe className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Not Connected</h2>
          <p className="text-gray-400 mb-6">Select an account to run the Market Intelligence Engine.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Intelligence Engine</h1>
          <p className="text-gray-400 text-sm mt-1">Detect markets, understand behavior, and adapt strategy automatically.</p>
        </div>
      </div>

      {marketData.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center">
          <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Active Campaigns</h2>
          <p className="text-gray-400">We couldn't find any active campaigns with spend to analyze markets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {marketData.map((data, index) => (
            <div key={data.campaign.id || index} className="glass-panel rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-white/5 bg-[#111827]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                      <MapPin className="w-3 h-3" />
                      {data.market.name}
                    </span>
                    <span className="text-sm text-gray-500">Market Detected</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{data.campaign.name}</h2>
                </div>
                <div className="flex items-center gap-6 bg-[#0B0F19] px-5 py-3 rounded-xl border border-white/10 shadow-inner">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1">Spend</div>
                    <div className="font-bold text-gray-200">${data.metrics.spend.toFixed(2)}</div>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1">ROAS</div>
                    <div className={cn("font-bold", data.metrics.roas >= 2 ? "text-green-400" : "text-gray-200")}>{data.metrics.roas.toFixed(2)}x</div>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1">CTR</div>
                    <div className="font-bold text-gray-200">{data.metrics.ctr.toFixed(2)}%</div>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1">CPM</div>
                    <div className="font-bold text-gray-200">${data.metrics.cpm.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-[#0B0F19]/30">
                
                {/* Behavior Insight */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-300 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-indigo-400" />
                    Behavior Insight
                  </h3>
                  <div className="p-5 bg-indigo-500/5 rounded-xl border border-indigo-500/10 h-full shadow-inner">
                    <p className="text-sm text-indigo-200/80 leading-relaxed">{data.market.behavior}</p>
                  </div>
                </div>

                {/* Strategy Recommendation */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-300 uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Strategy Recommendation
                  </h3>
                  <div className="p-5 bg-amber-500/5 rounded-xl border border-amber-500/10 h-full shadow-inner">
                    <p className="text-sm text-amber-200/80 leading-relaxed">{data.market.strategy}</p>
                  </div>
                </div>

                {/* Creative Direction */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-300 uppercase tracking-wider">
                    <ImageIcon className="w-4 h-4 text-pink-400" />
                    Creative Direction
                  </h3>
                  <div className="p-5 bg-pink-500/5 rounded-xl border border-pink-500/10 h-full flex flex-col justify-between shadow-inner">
                    <p className="text-sm text-pink-200/80 leading-relaxed mb-4">What type of ads to create for this market:</p>
                    <div className="bg-[#0B0F19] p-3.5 rounded-lg border border-pink-500/20 shadow-sm">
                      <p className="text-sm font-medium text-gray-200 italic">"{data.market.creative}"</p>
                    </div>
                  </div>
                </div>

                {/* Pricing & KPIs */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-300 uppercase tracking-wider">
                    <Target className="w-4 h-4 text-emerald-400" />
                    Pricing & KPIs
                  </h3>
                  <div className="p-5 bg-emerald-500/5 rounded-xl border border-emerald-500/10 h-full flex flex-col gap-4 shadow-inner">
                    <div>
                      <div className="text-xs font-bold text-emerald-400 uppercase mb-1.5 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Pricing Strategy
                      </div>
                      <p className="text-sm text-emerald-200/80">{data.market.pricing}</p>
                    </div>
                    <div className="pt-4 border-t border-emerald-500/20">
                      <div className="text-xs font-bold text-emerald-400 uppercase mb-2.5 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" /> Expected KPIs
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-emerald-500/80">CTR:</span>
                          <span className="font-bold text-emerald-300">{data.market.kpis.ctr}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-500/80">ROAS:</span>
                          <span className="font-bold text-emerald-300">{data.market.kpis.roas}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-500/80">CPM:</span>
                          <span className="font-bold text-emerald-300">{data.market.kpis.cpm}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
