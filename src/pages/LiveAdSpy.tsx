import React, { useState } from 'react';
import { Search, Globe, Filter, ExternalLink, Calendar, Users, DollarSign, Eye, AlertCircle, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import { getAIClient } from '../lib/gemini';
import { usePersistedState } from '../hooks/usePersistedState';

export function LiveAdSpy() {
  const { user } = useAuth();
  const { metaToken } = useFilters();
  
  const [searchTerms, setSearchTerms] = usePersistedState('ad_spy_search', '');
  const [country, setCountry] = usePersistedState('ad_spy_country', 'US');
  const [loading, setLoading] = useState(false);
  const [ads, setAds] = usePersistedState<any[]>('ad_spy_results', []);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = usePersistedState<string | null>('ad_spy_analysis', null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerms.trim()) return;
    if (!metaToken) {
      setError('Meta connection required. Please connect your Meta account in Settings.');
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);
    setAnalysis(null);

    try {
      const headers = {
        'x-user-id': user!.uid,
        'x-meta-token': metaToken
      };

      const res = await fetch(`/api/ad-spy/meta?searchTerms=${encodeURIComponent(searchTerms)}&country=${country}`, { headers });
      
      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(`Server returned an invalid response (Status: ${res.status})`, { cause: e });
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAds(data.ads || []);
      if (data.warning) {
        setWarning(data.warning);
      }
    } catch (err: any) {
      console.error('Failed to fetch ads', err);
      setError(err.message || 'Failed to fetch ads from Meta Ads Library.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (ads.length === 0) return;
    
    setAnalyzing(true);
    try {
      const ai = getAIClient();
      
      const prompt = `
        Analyze the following active ads from the Meta Ads Library for the search term "${searchTerms}".
        Identify winning patterns, common hooks, offers, and creative strategies used by these advertisers.
        
        Ads Data:
        ${JSON.stringify(ads.slice(0, 20).map(ad => ({
          pageName: ad.page_name,
          body: ad.ad_creative_bodies?.[0],
          title: ad.ad_creative_link_titles?.[0],
          platforms: ad.publisher_platforms
        })))}

        Provide a concise, actionable analysis with the following sections:
        1. **Common Hooks & Angles**: What are the main ways they grab attention?
        2. **Offers & Value Props**: What are they selling and how are they pricing/positioning it?
        3. **Creative Formats**: What seems to be the dominant format (based on text length, platforms, etc.)?
        4. **Actionable Takeaways**: 3 bullet points on how to compete against these ads.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      if (!response.text) throw new Error('No response from AI');
      setAnalysis(response.text);
    } catch (err: any) {
      console.error('Failed to analyze ads', err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('limit')) {
        setError('AI request limit reached. Please try again in a few minutes.');
      } else {
        setError(err.message || 'Failed to analyze ads.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Ad Spy System</h1>
          <p className="text-gray-400 text-sm mt-1">Search the Meta Ads Library for active ads to analyze winning patterns.</p>
        </div>
        {ads.length > 0 && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.15)]"
          >
            <Sparkles className="w-4 h-4" />
            {analyzing ? 'Analyzing Patterns...' : 'Analyze Patterns with AI'}
          </button>
        )}
      </div>

      {!metaToken && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-400">Meta Connection Required</h3>
            <p className="text-sm text-amber-500/80 mt-1">
              You need to connect your Meta account in the Settings page to use the Live Ad Spy System.
            </p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="glass-panel p-6 rounded-2xl">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by keyword, page name, or advertiser..."
              value={searchTerms}
              onChange={(e) => setSearchTerms(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-500 transition-colors"
            />
          </div>
          
          <div className="w-full md:w-48">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0B0F19] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white transition-colors appearance-none"
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="EG">Egypt</option>
              <option value="AE">UAE</option>
              <option value="SA">Saudi Arabia</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !searchTerms.trim() || !metaToken}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]"
          >
            {loading ? 'Searching...' : 'Search Ads'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold">Error</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
        </div>
      )}

      {warning && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">Notice</p>
            <p className="text-xs opacity-80">{warning}</p>
          </div>
        </div>
      )}
      
      {/* AI Analysis Result */}
      {analysis && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-indigo-300">AI Pattern Analysis</h2>
          </div>
          <div className="prose prose-invert prose-indigo max-w-none text-sm text-gray-300">
            <Markdown>{analysis}</Markdown>
          </div>
        </div>
      )}

      {/* Results */}
      {ads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad) => (
            <div key={ad.id} className="glass-panel rounded-2xl overflow-hidden flex flex-col group">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#111827]/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xs border border-blue-500/30">
                    {ad.page_name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <div className="font-bold text-gray-200 text-sm line-clamp-1">{ad.page_name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Started: {ad.ad_delivery_start_time ? new Date(ad.ad_delivery_start_time).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
                <a 
                  href={`https://www.facebook.com/ads/library/?id=${ad.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-blue-400 transition-colors"
                  title="View in Meta Ads Library"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                {ad.ad_creative_bodies && ad.ad_creative_bodies.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-300 line-clamp-4 whitespace-pre-wrap leading-relaxed">
                      {ad.ad_creative_bodies[0]}
                    </p>
                  </div>
                )}
                
                {ad.ad_creative_link_titles && ad.ad_creative_link_titles.length > 0 && (
                  <div className="mt-auto pt-4 border-t border-white/5">
                    <h4 className="font-bold text-gray-200 text-sm line-clamp-2">{ad.ad_creative_link_titles[0]}</h4>
                    {ad.ad_creative_link_descriptions && ad.ad_creative_link_descriptions.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{ad.ad_creative_link_descriptions[0]}</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="px-5 py-3 bg-[#111827]/30 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="truncate">{ad.publisher_platforms?.join(', ') || 'Meta'}</span>
                </div>
                {ad.impressions && (
                  <div className="flex items-center gap-1.5 text-gray-500 justify-end">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{ad.impressions.lower_bound} - {ad.impressions.upper_bound}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && ads.length === 0 && searchTerms && !error && (
        <div className="text-center py-12 glass-panel rounded-2xl">
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white">No ads found</h3>
          <p className="text-gray-400 mt-1">Try adjusting your search terms or selecting a different country.</p>
        </div>
      )}
    </div>
  );
}
