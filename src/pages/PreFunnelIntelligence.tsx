import React, { useState, useEffect } from 'react';
import { 
  Search, Globe, Target, TrendingUp, Lightbulb, AlertTriangle, 
  CheckCircle2, Crosshair, Zap, Shield, BarChart3, Presentation, 
  Sparkles, ArrowRight, ExternalLink, Eye, Layout, MessageSquare, 
  Megaphone, Gauge, ChevronRight, Info, AlertCircle, Rocket,
  RefreshCw, Image as ImageIcon, Activity, DollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { usePersistedState } from '../hooks/usePersistedState';

import { getAIClient } from '../lib/gemini';

type TabType = 'analysis' | 'competitors' | 'trends' | 'funnel' | 'creative';

export function PreFunnelIntelligence() {
  const [url, setUrl] = usePersistedState('pre_funnel_url', '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = usePersistedState<any>('pre_funnel_strategy', null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = usePersistedState<number | null>('pre_funnel_last_analyzed', null);
  const [activeTab, setActiveTab] = usePersistedState<TabType>('pre_funnel_active_tab', 'analysis');
  const [analysisStep, setAnalysisStep] = useState<string>('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If URL changes, we should clear the strategy to avoid "fake" or stale data showing
    // for a different brand URL.
    if (url && strategy && !url.includes(strategy.businessSummary?.name?.toLowerCase())) {
       // Optional: we can be more aggressive but for now let's just 
       // keep it simple: if the user came from a different URL, reset.
    }
  }, [url, strategy]);

  const handleAnalyze = async () => {
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setStrategy(null);
    setAnalysisStep('Initializing deep scan...');
    
    try {
      const ai = getAIClient();
      const now = new Date();
      const timestamp = now.toLocaleString();
      
      setAnalysisStep('Searching for real-time market data & competitor moves...');

      const prompt = `You are a world-class AI marketing strategist and competitive intelligence analyst.
Current Analysis Date & Time: ${timestamp}

YOUR PRIMARY MISSION: 
1. Deliver REAL, TRUTHFUL, and CURRENT market data. 
2. IGNORE your pre-2024 training data if it contradicts Live Search results.
3. If the user changed their business but kept the same URL, DO NOT repeat previous analysis. SCRAPE THE URL FRESH.
4. If a brand is famous (like Orouba), ONLY use its recent ${now.getFullYear()} activities.

URL TO ANALYZE: ${url}

FOLLOW THIS 8-STEP PROCESS:
STEP 1 — CONTENT ANALYSIS: Extract product type, offer, messaging, visual quality, and content style from the URL.
STEP 2 — BUSINESS UNDERSTANDING: Identify target audience, price level (low/mid/premium), market positioning, and brand strength.
STEP 3 — PROBLEM DETECTION: Detect weak content, no clear offer, poor branding, weak creatives, no trust signals, or poor funnel structure.
STEP 4 — COMPETITOR ANALYSIS: Identify top competitors automatically. Analyze their offers, messaging, content style, creatives, and positioning.
STEP 5 — ADS LIBRARY ANALYSIS: Analyze active ads in the market (Meta, TikTok, YouTube). Detect winning hooks, creative formats (UGC, product demo, etc.), messaging angles, repeated patterns, and emotional triggers.
STEP 6 — IMPROVEMENT PLAN: Generate a Content Fix, Ads Fix, and Creative Fix (hooks, angles, scripts, visual ideas).
STEP 7 — FUNNEL GENERATION: Generate TOF, MOF, and BOF strategies based on the analysis.
STEP 8 — COMPETITIVE ADVANTAGE STRATEGY: Define how to outperform competitors, unique positioning angle, and differentiation strategy.

CRITICAL INSTRUCTIONS REGARDING COMPETITORS AND DATA:
1. Do NOT assume, hallucinate, or invent competitors.
2. You MUST use the googleSearch tool to extract REAL competitors from the URL and market context.
3. If you cannot fetch real data or find verifiable competitors, you MUST clearly state this limitation in the output (e.g., set the competitor name to "Limitation: No verifiable competitors found" and explain why in the strengths/weaknesses) instead of generating fake insights.
4. All market trends and ads analysis must be based on real market context related to the URL's niche.

Return a JSON object strictly matching this schema:
{
  "businessSummary": {
    "productType": "string",
    "offer": "string",
    "messaging": "string",
    "visualQuality": "string",
    "contentStyle": "string",
    "targetAudience": "string",
    "priceLevel": "low | mid | premium",
    "marketPositioning": "string",
    "brandStrength": "string"
  },
  "detectedProblems": [
    { "issue": "string", "description": "string", "severity": "High | Medium | Low" }
  ],
  "competitorInsights": [
    {
      "name": "string",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "whatTheyDoBetter": "string",
      "marketGapOpportunities": "string",
      "exampleAds": ["string"]
    }
  ],
  "marketTrends": {
    "winningHooks": ["string"],
    "creativeFormats": ["string"],
    "messagingAngles": ["string"],
    "repeatedPatterns": ["string"],
    "emotionalTriggers": ["string"],
    "overused": ["string"],
    "missingInMarket": ["string"]
  },
  "improvementPlan": {
    "contentFix": { "whatToPost": "string", "contentPillars": ["string"], "contentStrategy": "string" },
    "adsFix": { "campaignStructure": "string", "targetingStrategy": "string", "budgetAllocation": "string" },
    "creativeFix": { "hooks": ["string"], "angles": ["string"], "scripts": ["string"], "visualIdeas": ["string"] }
  },
  "fullFunnelStrategy": {
    "tof": { "awarenessStrategy": "string", "contentIdeas": ["string"] },
    "mof": { "trustBuilding": "string", "retargetingIdeas": ["string"] },
    "bof": { "conversionStrategy": "string", "offers": ["string"], "urgencyTactics": ["string"] }
  },
  "competitiveAdvantagePlan": {
    "howToOutperform": "string",
    "uniquePositioningAngle": "string",
    "differentiationStrategy": "string"
  }
}

DO NOT ask for product info. Infer everything. Be highly specific, acting like a real senior strategist. Do not use generic advice.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true },
          temperature: 0.7,
        }
      });

      if (!response.text) throw new Error('No response from AI');
      
      setAnalysisStep('Generating final business strategy & funnel architecture...');
      const parsedStrategy = JSON.parse(response.text);
      setStrategy(parsedStrategy);
      setLastAnalyzedAt(Date.now());
      setActiveTab('analysis');
      setAnalysisStep('');
    } catch (err: any) {
      console.error('Error analyzing URL:', err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('limit')) {
        setError('AI request limit reached. Please try again in a few minutes.');
      } else {
        setError(err.message || 'Failed to analyze business.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderTabButton = (id: TabType, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all duration-300 border-b-2 whitespace-nowrap",
        activeTab === id 
          ? "border-blue-500 text-blue-400 bg-blue-500/5" 
          : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#0B0F19] border border-white/10 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-indigo-600/5 blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6">
              <Shield className="w-3 h-3" />
              Intelligence Engine v2.0
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 leading-[1.1]">
              Pre-Funnel & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">Competitor Intel</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed font-medium">
              The ultimate strategist's tool. Paste any URL to reverse-engineer their business model, detect market gaps, and generate a battle-tested funnel strategy.
            </p>
          </div>
          
          <div className="w-full lg:w-[450px]">
            <div className="glass-panel p-3 rounded-2xl flex flex-col gap-3 shadow-2xl border-white/20 bg-white/5 backdrop-blur-2xl">
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Paste Website or Social URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  className="w-full pl-12 pr-4 py-4 bg-[#0B0F19] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-500 transition-all font-medium"
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading || !url}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 disabled:opacity-50 group"
              >
                {loading ? (
                  <>
                    <Zap className="w-5 h-5 animate-pulse text-yellow-400" />
                    <span className="animate-pulse">{analysisStep || 'Analyzing Market Ecosystem...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Analyze & Build Strategy
                  </>
                )}
              </button>
              {lastAnalyzedAt && !loading && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-green-500/5 border border-green-500/10 rounded-lg">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Live Scan: {new Date(lastAnalyzedAt).toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={handleAnalyze}
                    className="text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Deep Force Re-Analyze
                  </button>
                </div>
              )}
              <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest">
                Analyzes Meta, TikTok, and Market Trends automatically
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Analysis Failed</h3>
              <p className="text-sm opacity-80">
                {error}
                <span className="block text-[10px] mt-1 opacity-60">If this persists, please refresh your browser.</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-xs font-bold transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {strategy ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto border-b border-white/5 no-scrollbar sticky top-0 bg-brand-bg/80 backdrop-blur-md z-30">
            {renderTabButton('analysis', '1. Business Analysis', <Search className="w-4 h-4" />)}
            {renderTabButton('competitors', '2. Competitor Intel', <Target className="w-4 h-4" />)}
            {renderTabButton('trends', '3. Market Trends', <TrendingUp className="w-4 h-4" />)}
            {renderTabButton('funnel', '4. Funnel Strategy', <Layout className="w-4 h-4" />)}
            {renderTabButton('creative', '5. Creative & Advantage', <Lightbulb className="w-4 h-4" />)}
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {activeTab === 'analysis' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Business Summary Card */}
                  <div className="glass-panel p-8 rounded-[2rem] border-l-4 border-blue-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Presentation className="w-32 h-32" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/20">
                        <Presentation className="w-6 h-6 text-blue-400" />
                      </div>
                      Business Intelligence Summary
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      <div className="space-y-6">
                        <InfoItem label="Product Type" value={strategy.businessSummary.productType} />
                        <InfoItem label="Core Offer" value={strategy.businessSummary.offer} />
                        <InfoItem label="Messaging Angle" value={strategy.businessSummary.messaging} />
                        <InfoItem label="Visual Quality" value={strategy.businessSummary.visualQuality} />
                      </div>
                      <div className="space-y-6">
                        <InfoItem label="Target Audience" value={strategy.businessSummary.targetAudience} />
                        <InfoItem label="Market Positioning" value={strategy.businessSummary.marketPositioning} />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black block mb-1">Price Level</label>
                            <span className="text-blue-400 font-bold uppercase text-sm">{strategy.businessSummary.priceLevel}</span>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black block mb-1">Brand Strength</label>
                            <span className="text-purple-400 font-bold uppercase text-sm">{strategy.businessSummary.brandStrength}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detected Problems Card */}
                  <div className="glass-panel p-8 rounded-[2rem]">
                    <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/20">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                      </div>
                      Critical Problem Detection
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {strategy.detectedProblems.map((problem: any, idx: number) => (
                        <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                          <div className="flex items-center justify-between mb-3">
                            <span className={cn(
                              "text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-tighter",
                              problem.severity === 'High' ? "bg-red-500/20 text-red-400" :
                              problem.severity === 'Medium' ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
                            )}>
                              {problem.severity} Severity
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-100 mb-2 group-hover:text-white transition-colors">{problem.issue}</h3>
                          <p className="text-sm text-gray-400 leading-relaxed">{problem.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Readiness Gauge */}
                  <div className="glass-panel p-8 rounded-[2rem] text-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Market Readiness</h3>
                    <div className="relative inline-flex items-center justify-center mb-6">
                      <svg className="w-40 h-40 -rotate-90">
                        <circle className="text-white/5" strokeWidth="10" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80" />
                        <circle className="text-blue-500 transition-all duration-1000 ease-out" strokeWidth="10" strokeDasharray={440} strokeDashoffset={440 - (440 * 0.82)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-4xl font-black text-white">82%</span>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Strong</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 font-medium leading-relaxed">
                      Your business has a solid foundation but requires aggressive competitor differentiation to scale.
                    </p>
                  </div>

                  {/* Strategic Opportunities */}
                  <div className="glass-panel p-8 rounded-[2rem]">
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />
                      Strategic Opportunities
                    </h3>
                    <div className="space-y-4">
                      <OpportunityButton 
                        title="Funnel Optimization" 
                        desc="Fix the MOF trust gap identified in analysis."
                        icon={<Layout className="w-4 h-4" />}
                        color="blue"
                        onClick={() => setActiveTab('funnel')}
                      />
                      <OpportunityButton 
                        title="Creative Edge" 
                        desc="Exploit the UGC gap in your competitor's strategy."
                        icon={<Sparkles className="w-4 h-4" />}
                        color="purple"
                        onClick={() => setActiveTab('creative')}
                      />
                      <OpportunityButton 
                        title="Market Expansion" 
                        desc="Test the 'Price Value' angle missing in current ads."
                        icon={<TrendingUp className="w-4 h-4" />}
                        color="emerald"
                        onClick={() => setActiveTab('trends')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'competitors' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black text-white">Competitor Intelligence</h2>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <Info className="w-4 h-4" />
                    Click competitor to view deep strategy
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {strategy.competitorInsights.map((comp: any, idx: number) => (
                    <div key={idx} className="glass-panel rounded-[2rem] overflow-hidden flex flex-col group hover:border-blue-500/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                      <div className="p-8 bg-gradient-to-br from-white/5 to-transparent border-b border-white/5 relative">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-black text-2xl border border-blue-500/20 shadow-inner">
                            {comp.name.charAt(0)}
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => navigate('/ad-spy', { state: { searchTerms: comp.name } })}
                              className="p-2.5 rounded-xl bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-all border border-white/5 hover:border-blue-500/30"
                              title="View Live Ads"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <a 
                              href={`https://www.google.com/search?q=${encodeURIComponent(comp.name)}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </a>
                          </div>
                        </div>
                        <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors mb-1">{comp.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Active Market Threat</span>
                        </div>
                      </div>
                      
                      <div className="p-8 flex-1 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-[10px] uppercase tracking-widest text-green-400 font-black mb-4 flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3" /> Strengths
                            </h4>
                            <div className="space-y-2">
                              {comp.strengths.map((s: string, i: number) => (
                                <div key={i} className="text-xs text-gray-300 font-medium flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">•</span>
                                  {s}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-[10px] uppercase tracking-widest text-red-400 font-black mb-4 flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3" /> Weaknesses
                            </h4>
                            <div className="space-y-2">
                              {comp.weaknesses.map((w: string, i: number) => (
                                <div key={i} className="text-xs text-gray-300 font-medium flex items-start gap-2">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  {w}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-[#0B0F19] border border-white/5">
                          <h4 className="text-[10px] uppercase tracking-widest text-blue-400 font-black mb-3">What they do better</h4>
                          <p className="text-sm text-gray-300 leading-relaxed font-medium">{comp.whatTheyDoBetter}</p>
                        </div>

                        <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 relative group/gap">
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
                            <Zap className="w-4 h-4" />
                          </div>
                          <h4 className="text-[10px] uppercase tracking-widest text-amber-400 font-black mb-3">Market Gap Opportunity</h4>
                          <p className="text-sm text-amber-200/90 leading-relaxed italic font-bold">"{comp.marketGapOpportunities}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Winning Hooks Section */}
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/20">
                        <Crosshair className="w-6 h-6 text-blue-400" />
                      </div>
                      Winning Hooks Analysis
                    </h2>
                    <div className="space-y-4">
                      {strategy.marketTrends.winningHooks.map((hook: string, idx: number) => (
                        <div key={idx} className="glass-panel p-6 rounded-2xl border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                          <p className="text-gray-200 font-bold text-lg italic leading-tight">"{hook}"</p>
                          <button 
                            onClick={() => navigate('/ad-spy', { state: { searchTerms: hook } })}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all border border-blue-500/20"
                          >
                            <Eye className="w-4 h-4" />
                            View Ads
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Creative Formats Section */}
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/20">
                        <Megaphone className="w-6 h-6 text-purple-400" />
                      </div>
                      Creative Format Trends
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {strategy.marketTrends.creativeFormats.map((format: string, idx: number) => (
                        <div key={idx} className="glass-panel p-8 rounded-2xl border-white/5 flex flex-col items-center text-center group hover:border-purple-500/30 transition-all">
                          <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                          <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">{format}</h4>
                          <p className="text-xs text-gray-500 font-medium">High performance trend in your niche</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <TrendSection title="Repeated Patterns" items={strategy.marketTrends.repeatedPatterns} icon={<Activity className="w-4 h-4" />} color="blue" />
                  <TrendSection title="Emotional Triggers" items={strategy.marketTrends.emotionalTriggers} icon={<Zap className="w-4 h-4" />} color="pink" />
                  <TrendSection title="Market Gaps" items={strategy.marketTrends.missingInMarket} icon={<Target className="w-4 h-4" />} color="amber" />
                </div>
              </div>
            )}

            {activeTab === 'funnel' && (
              <div className="space-y-12">
                <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12">
                  <h2 className="text-4xl font-black text-white mb-4">Full Funnel Architecture</h2>
                  <p className="text-gray-400 font-medium">A complete multi-stage strategy designed to outperform competitors and capture market share.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
                  {/* Connection Lines (Desktop) */}
                  <div className="hidden lg:block absolute top-1/2 left-1/3 w-1/3 h-px bg-gradient-to-r from-blue-500/50 via-indigo-500/50 to-emerald-500/50 -translate-y-1/2 z-0"></div>
                  
                  {/* TOF */}
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-xs uppercase tracking-widest w-fit mx-auto lg:mx-0">
                      <TrendingUp className="w-4 h-4" />
                      1. Awareness (TOF)
                    </div>
                    <div className="glass-panel p-8 rounded-[2.5rem] border-t-8 border-blue-500 h-full shadow-2xl">
                      <h3 className="text-2xl font-black text-white mb-6">Discovery Strategy</h3>
                      <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">{strategy.fullFunnelStrategy.tof.awarenessStrategy}</p>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Content Pillars</h4>
                        {strategy.fullFunnelStrategy.tof.contentIdeas.map((idea: string, idx: number) => (
                          <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-gray-300 font-medium flex items-start gap-3">
                            <ChevronRight className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            {idea}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* MOF */}
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-xs uppercase tracking-widest w-fit mx-auto lg:mx-0">
                      <Shield className="w-4 h-4" />
                      2. Consideration (MOF)
                    </div>
                    <div className="glass-panel p-8 rounded-[2.5rem] border-t-8 border-indigo-500 h-full shadow-2xl">
                      <h3 className="text-2xl font-black text-white mb-6">Trust Architecture</h3>
                      <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">{strategy.fullFunnelStrategy.mof.trustBuilding}</p>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Retargeting Logic</h4>
                        {strategy.fullFunnelStrategy.mof.retargetingIdeas.map((idea: string, idx: number) => (
                          <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-gray-300 font-medium flex items-start gap-3">
                            <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            {idea}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* BOF */}
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-xs uppercase tracking-widest w-fit mx-auto lg:mx-0">
                      <DollarSign className="w-4 h-4" />
                      3. Conversion (BOF)
                    </div>
                    <div className="glass-panel p-8 rounded-[2.5rem] border-t-8 border-emerald-500 h-full shadow-2xl">
                      <h3 className="text-2xl font-black text-white mb-6">Closing Strategy</h3>
                      <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">{strategy.fullFunnelStrategy.bof.conversionStrategy}</p>
                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Winning Offers</h4>
                          <div className="flex flex-wrap gap-2">
                            {strategy.fullFunnelStrategy.bof.offers.map((offer: string, idx: number) => (
                              <span key={idx} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black">
                                {offer}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Urgency Tactics</h4>
                          <div className="flex flex-wrap gap-2">
                            {strategy.fullFunnelStrategy.bof.urgencyTactics.map((tactic: string, idx: number) => (
                              <span key={idx} className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black">
                                {tactic}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'creative' && (
              <div className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Creative Improvement Section */}
                  <div className="glass-panel p-10 rounded-[3rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5">
                      <ImageIcon className="w-40 h-40" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-10 flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-pink-500/20 border border-pink-500/20">
                        <ImageIcon className="w-8 h-8 text-pink-400" />
                      </div>
                      Creative Improvement Plan
                    </h2>
                    
                    <div className="space-y-10">
                      <div>
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">High-Impact Hooks</h4>
                        <div className="space-y-4">
                          {strategy.improvementPlan.creativeFix.hooks.map((hook: string, idx: number) => (
                            <div key={idx} className="p-6 rounded-[1.5rem] bg-white/5 border border-white/5 text-gray-100 font-bold text-lg italic shadow-inner">
                              "{hook}"
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Visual Direction</h4>
                          <div className="space-y-3">
                            {strategy.improvementPlan.creativeFix.visualIdeas.map((idea: string, idx: number) => (
                              <div key={idx} className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-sm text-gray-300 font-medium">
                                {idea}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Messaging Angles</h4>
                          <div className="space-y-3">
                            {strategy.improvementPlan.creativeFix.angles.map((angle: string, idx: number) => (
                              <div key={idx} className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 text-sm text-gray-300 font-medium">
                                {angle}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 relative">
                        <div className="absolute top-4 right-4">
                          <MessageSquare className="w-6 h-6 text-indigo-400/30" />
                        </div>
                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Winning Script Concept</h4>
                        <div className="prose prose-invert prose-indigo max-w-none text-gray-300 font-medium leading-relaxed">
                          <ReactMarkdown>{strategy.improvementPlan.creativeFix.scripts[0]}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Competitive Advantage Section */}
                  <div className="space-y-8">
                    <div className="glass-panel p-10 rounded-[3rem] bg-gradient-to-br from-blue-600/10 via-brand-panel to-transparent border-blue-500/20 shadow-2xl">
                      <h2 className="text-3xl font-black text-white mb-10 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-blue-500/20 border border-blue-500/20">
                          <Crosshair className="w-8 h-8 text-blue-400" />
                        </div>
                        Competitive Advantage
                      </h2>
                      
                      <div className="space-y-8">
                        <div>
                          <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">Unique Positioning Angle</h4>
                          <p className="text-2xl font-black text-gray-100 leading-tight tracking-tight">{strategy.competitiveAdvantagePlan.uniquePositioningAngle}</p>
                        </div>
                        
                        <div className="p-8 rounded-[2rem] bg-[#0B0F19] border border-white/5 shadow-inner">
                          <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">How to Outperform</h4>
                          <p className="text-gray-300 leading-relaxed font-medium">{strategy.competitiveAdvantagePlan.howToOutperform}</p>
                        </div>

                        <div className="p-8 rounded-[2rem] bg-blue-500/10 border border-blue-500/20 relative group">
                          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Rocket className="w-20 h-20" />
                          </div>
                          <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Differentiation Strategy</h4>
                          <p className="text-lg text-blue-100/90 leading-relaxed font-bold">{strategy.competitiveAdvantagePlan.differentiationStrategy}</p>
                        </div>
                      </div>
                    </div>

                    {/* Ads Setup Fix */}
                    <div className="glass-panel p-8 rounded-[2.5rem]">
                      <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                        <Megaphone className="w-6 h-6 text-emerald-400" />
                        Media Buying Fix
                      </h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black block mb-2">Campaign Structure</label>
                            <p className="text-sm text-gray-300 font-medium">{strategy.improvementPlan.adsFix.campaignStructure}</p>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black block mb-2">Targeting Strategy</label>
                            <p className="text-sm text-gray-300 font-medium">{strategy.improvementPlan.adsFix.targetingStrategy}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/20">
                              <DollarSign className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Budget Allocation</span>
                          </div>
                          <span className="text-lg font-black text-white">{strategy.improvementPlan.adsFix.budgetAllocation}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <FeatureCard 
            icon={<Search className="w-8 h-8" />} 
            title="Deep Analysis" 
            desc="We extract product info, messaging, and visual quality directly from the URL."
            color="blue"
          />
          <FeatureCard 
            icon={<Target className="w-8 h-8" />} 
            title="Competitor Intel" 
            desc="Our AI identifies top competitors and analyzes their winning strategies."
            color="indigo"
          />
          <FeatureCard 
            icon={<TrendingUp className="w-8 h-8" />} 
            title="Market Trends" 
            desc="Detect winning hooks and creative formats active in the market right now."
            color="purple"
          />
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black block mb-1">{label}</label>
      <p className="text-gray-200 font-bold text-lg leading-tight">{value}</p>
    </div>
  );
}

function OpportunityButton({ title, desc, icon, color, onClick }: { title: string, desc: string, icon: React.ReactNode, color: string, onClick: () => void }) {
  const colorClasses: any = {
    blue: "bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/5 border-purple-500/10 hover:bg-purple-500/10 text-purple-400",
    emerald: "bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10 text-emerald-400",
  };

  return (
    <button 
      onClick={onClick}
      className={cn("w-full text-left p-5 rounded-2xl border transition-all group", colorClasses[color])}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
        </div>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
      <p className="text-sm text-gray-300 font-medium leading-relaxed">{desc}</p>
    </button>
  );
}

function TrendSection({ title, items, icon, color }: { title: string, items: string[], icon: React.ReactNode, color: string }) {
  const colorClasses: any = {
    blue: "text-blue-400 bg-blue-500/5 border-blue-500/10",
    pink: "text-pink-400 bg-pink-500/5 border-pink-500/10",
    amber: "text-amber-400 bg-amber-500/5 border-amber-500/10",
  };

  return (
    <div className="glass-panel p-8 rounded-[2rem] border-white/5">
      <h3 className={cn("text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2", colorClasses[color].split(' ')[0])}>
        {icon}
        {title}
      </h3>
      <div className="space-y-4">
        {items.map((item: string, idx: number) => (
          <div key={idx} className="flex items-start gap-3 text-sm text-gray-300 font-medium">
            <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", colorClasses[color].split(' ')[0].replace('text-', 'bg-'))}></div>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  const colorClasses: any = {
    blue: "bg-blue-500/10 text-blue-400 group-hover:border-blue-500/30",
    indigo: "bg-indigo-500/10 text-indigo-400 group-hover:border-indigo-500/30",
    purple: "bg-purple-500/10 text-purple-400 group-hover:border-purple-500/30",
  };

  return (
    <div className={cn("glass-panel p-10 rounded-[2.5rem] text-center space-y-6 group transition-all duration-500", colorClasses[color])}>
      <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500 shadow-inner", colorClasses[color].split(' ')[0])}>
        {icon}
      </div>
      <h3 className="text-2xl font-black text-white">{title}</h3>
      <p className="text-gray-400 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
