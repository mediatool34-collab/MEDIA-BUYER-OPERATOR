import React, { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, ChevronRight, Target, Users, Image as ImageIcon, DollarSign, Wrench, Search, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { usePersistedState } from '../hooks/usePersistedState';

export function DiagnosisEngine() {
  const { user } = useAuth();
  const { selectedAccountId, datePreset, metaToken, googleToken, tiktokToken, platform } = useFilters();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [diagnoses, setDiagnoses] = usePersistedState<any[]>('diagnosis_results', []);

  const getToken = useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken]);

  useEffect(() => {
    const fetchAndDiagnose = async () => {
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

        const allItems = [
          ...campaigns.map((c: any) => ({ ...c, level: 'Campaign' })),
          ...adsets.map((a: any) => ({ ...a, level: 'Ad Set' })),
          ...ads.map((a: any) => ({ ...a, level: 'Ad' }))
        ];

        const newDiagnoses: any[] = [];

        allItems.forEach(item => {
          const metrics = insights.find((i: any) => i.id === item.id)?.metrics;
          if (!metrics || metrics.spend === 0) return;

          const ctr = metrics.ctr || 0;
          const cpm = metrics.cpm || 0;
          const cvr = metrics.cvr || 0;
          const cpa = metrics.cpa || 0;
          const roas = metrics.roas || 0;
          const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;

          const targetRoas = 2.0;
          const targetCpa = 50.0;
          
          let problemType = null;
          let reason = '';
          let suggestedFix: string[] = [];
          let priorityLevel = 'Low';
          let confidenceScore = 'Low';
          let explanation = '';

          // 1. CREATIVE PROBLEM
          if (ctr < 1.0 && cpm <= 50) {
            problemType = 'Creative';
            reason = 'Weak hook, Bad visual, Poor messaging';
            suggestedFix = ['New hooks', 'New angles'];
            priorityLevel = 'High';
            confidenceScore = 'High confidence (clear pattern)';
            explanation = `CTR is critically low (${ctr.toFixed(2)}%) while CPM ($${cpm.toFixed(2)}) is within normal range. The ad is winning auctions and being served, but the creative is failing to stop the scroll and capture attention.`;
          }
          // 3. OFFER / FUNNEL PROBLEM
          else if (ctr >= 1.0 && cpc <= 2.0 && cvr < 0.5) {
            problemType = 'Funnel';
            reason = 'Funnel or landing page issue';
            suggestedFix = ['Fix landing page', 'Improve offer'];
            priorityLevel = 'High';
            confidenceScore = 'High confidence (clear pattern)';
            explanation = `Strong front-end metrics (CTR: ${ctr.toFixed(2)}%, CPC: $${cpc.toFixed(2)}) indicate the ad and audience are aligned. However, the severe drop-off (CVR: ${cvr.toFixed(2)}%) points to a broken post-click experience or an uncompelling offer.`;
          }
          // 2. AUDIENCE PROBLEM
          else if (ctr >= 1.0 && cvr < 2.0) {
            problemType = 'Audience';
            reason = 'Wrong targeting, Low intent audience';
            suggestedFix = ['New targeting', 'Lookalikes', 'Broad targeting'];
            priorityLevel = 'Medium';
            confidenceScore = 'Medium confidence';
            explanation = `The ad is generating clicks (CTR: ${ctr.toFixed(2)}%), but the conversion rate (${cvr.toFixed(2)}%) is sub-optimal. This typically suggests we are driving low-intent traffic or there's a mismatch between the ad promise and the audience.`;
          }
          // 4. HIGH CPM PROBLEM
          else if (cpm > 50) {
            problemType = 'Audience';
            reason = 'Audience competition or ad quality';
            suggestedFix = ['Broaden audience', 'Improve ad quality ranking'];
            priorityLevel = 'Medium';
            confidenceScore = 'Medium confidence';
            explanation = `CPM is unusually high ($${cpm.toFixed(2)}). We are either bidding in a highly saturated, competitive auction, or the platform is penalizing the ad due to low relevance/quality scores.`;
          }
          // 5. PROFIT PROBLEM
          else if (roas < targetRoas && metrics.spend > targetCpa) {
            problemType = 'Budget';
            reason = 'Profitability is below break-even';
            suggestedFix = ['Reduce budget', 'Pause if sustained', 'Optimize bids'];
            priorityLevel = 'High';
            confidenceScore = 'High confidence (clear pattern)';
            explanation = `With $${metrics.spend.toFixed(2)} spent, the ROAS (${roas.toFixed(2)}x) is failing to meet the break-even target (${targetRoas}x). Immediate action is required to prevent further capital bleed.`;
          }

          if (problemType) {
            newDiagnoses.push({
              id: item.id,
              name: item.name,
              level: item.level,
              metrics,
              problemType,
              reason,
              suggestedFix,
              priorityLevel,
              confidenceScore,
              explanation
            });
          }
        });

        newDiagnoses.sort((a, b) => {
          const pMap: any = { 'High': 3, 'Medium': 2, 'Low': 1 };
          if (pMap[a.priorityLevel] !== pMap[b.priorityLevel]) {
            return pMap[b.priorityLevel] - pMap[a.priorityLevel];
          }
          return b.metrics.spend - a.metrics.spend;
        });

        setDiagnoses(newDiagnoses);
      } catch (error) {
        console.error('Failed to fetch and diagnose', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndDiagnose();
  }, [selectedAccountId, platform, datePreset, user, getToken, setDiagnoses]);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  const handleActionClick = (action: string, id: string) => {
    // In a real app, this would trigger a specific workflow or modal
    setToast({ message: `Triggering action: ${action} for item ${id}`, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleItemClick = (id: string, level: string) => {
    if (level === 'Campaign') {
      navigate('/campaigns');
    } else if (level === 'Ad') {
      navigate('/creatives');
    } else {
      navigate('/campaigns');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedAccountId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full">
          <Search className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Connected</h2>
          <p className="text-gray-500 mb-6">Select an account to run the Diagnosis Engine.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diagnosis Engine</h1>
          <p className="text-gray-500 text-sm mt-1">Automated root cause detection and actionable fixes.</p>
        </div>
      </div>

      {diagnoses.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-sm text-center">
          <Activity className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">All Clear!</h2>
          <p className="text-gray-500">No major issues detected in the selected date range.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {diagnoses.map((diagnosis) => (
            <div key={diagnosis.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div 
                className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleItemClick(diagnosis.id, diagnosis.level)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    diagnosis.priorityLevel === 'High' ? "bg-red-100 text-red-600" :
                    diagnosis.priorityLevel === 'Medium' ? "bg-yellow-100 text-yellow-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{diagnosis.level}</span>
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                      <h3 className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">{diagnosis.name}</h3>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>Spend: ${diagnosis.metrics.spend.toFixed(2)}</span>
                      <span>ROAS: {diagnosis.metrics.roas.toFixed(2)}x</span>
                      <span>CPA: ${diagnosis.metrics.cpa.toFixed(2)}</span>
                      <span>CTR: {diagnosis.metrics.ctr.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-500 uppercase">Priority</div>
                    <div className={cn(
                      "font-bold",
                      diagnosis.priorityLevel === 'High' ? "text-red-600" :
                      diagnosis.priorityLevel === 'Medium' ? "text-yellow-600" :
                      "text-blue-600"
                    )}>{diagnosis.priorityLevel}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-500 uppercase">Confidence</div>
                    <div className="font-bold text-gray-900">{diagnosis.confidenceScore}</div>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-400" />
                      Problem Type
                    </h4>
                    <p className="text-lg font-medium text-gray-800">{diagnosis.problemType}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-gray-400" />
                      Reason
                    </h4>
                    <p className="text-gray-700">{diagnosis.reason}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      Explanation
                    </h4>
                    <p className="text-gray-600 text-sm">{diagnosis.explanation}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-gray-400" />
                      Suggested Fix
                    </h4>
                    <ul className="space-y-2 mb-4">
                      {diagnosis.suggestedFix.map((fix: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                          {fix}
                        </li>
                      ))}
                    </ul>
                    
                    <div className="flex flex-wrap gap-2">
                      {diagnosis.problemType === 'Creative' && (
                        <button 
                          onClick={() => handleActionClick('Fix Creative', diagnosis.id)}
                          className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Fix Creative
                        </button>
                      )}
                      {diagnosis.problemType === 'Audience' && (
                        <button 
                          onClick={() => handleActionClick('Fix Audience', diagnosis.id)}
                          className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Users className="w-4 h-4" />
                          Fix Audience
                        </button>
                      )}
                      {diagnosis.problemType === 'Funnel' && (
                        <button 
                          onClick={() => handleActionClick('Fix Funnel', diagnosis.id)}
                          className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Target className="w-4 h-4" />
                          Fix Funnel
                        </button>
                      )}
                      {diagnosis.problemType === 'Budget' && (
                        <button 
                          onClick={() => handleActionClick('Optimize Budget', diagnosis.id)}
                          className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <DollarSign className="w-4 h-4" />
                          Optimize Budget
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className={cn(
            "px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 border",
            toast.type === 'success' ? "bg-green-50 border-green-200 text-green-800" :
            toast.type === 'error' ? "bg-red-50 border-red-200 text-red-800" :
            "bg-blue-50 border-blue-200 text-blue-800"
          )}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
            {toast.type === 'info' && <Activity className="w-5 h-5 text-blue-500" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
