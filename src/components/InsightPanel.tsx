import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, CheckCircle2, XCircle, AlertCircle, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface InsightPanelProps {
  analysis: any;
  loading: boolean;
  onFix?: () => Promise<void>;
  onViewDetails?: () => void;
}

export function InsightPanel({ analysis, loading, onFix, onViewDetails }: InsightPanelProps) {
  const [fixing, setFixing] = React.useState(false);
  const [justFixed, setJustFixed] = React.useState(false);

  // Reset success state when analysis changes
  React.useEffect(() => {
    setJustFixed(false);
  }, [analysis]);

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-white/10 rounded w-full"></div>
          <div className="h-4 bg-white/10 rounded w-5/6"></div>
          <div className="h-4 bg-white/10 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
        <Activity className="w-10 h-10 text-gray-600 mb-3" />
        <h3 className="text-white font-medium">No Insights Available</h3>
        <p className="text-gray-500 text-sm mt-1">Select an item to view AI analysis and recommendations.</p>
      </div>
    );
  }

  const { decision, creativeClassification, problems, suggestedAction } = analysis;

  const getDecisionColor = (d: string) => {
    switch (d) {
      case 'SCALE': return 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]';
      case 'KILL': return 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
      case 'OPTIMIZE': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getDecisionIcon = (d: string) => {
    switch (d) {
      case 'SCALE': return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'KILL': return <TrendingDown className="w-5 h-5 text-red-400" />;
      case 'OPTIMIZE': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden relative group">
      {justFixed && (
        <div className="absolute inset-0 bg-gray-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-500/30">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Optimization Applied</h3>
          <p className="text-gray-300 text-sm mb-6 max-w-xs">The recommended changes have been pushed to your ad account.</p>
          <div className="flex gap-3">
            <button 
              onClick={() => setJustFixed(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors border border-white/10"
            >
              Dismiss
            </button>
            {onViewDetails && (
              <button 
                onClick={onViewDetails}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]"
              >
                View Report
              </button>
            )}
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      <div className="p-5 border-b border-white/5 bg-[#111827]/50 flex items-center justify-between relative z-10">
        <h2 className="font-bold text-white flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          Decision Engine
        </h2>
        <div className={cn("px-4 py-1.5 rounded-full border text-sm font-bold flex items-center gap-2", getDecisionColor(decision))}>
          {getDecisionIcon(decision)}
          {decision}
        </div>
      </div>
      
      <div className="p-6 space-y-8 relative z-10">
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Suggested Action</h3>
          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
            <p className="text-gray-200 text-lg font-medium leading-relaxed">{suggestedAction}</p>
          </div>
        </div>

        {problems && problems.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Detected Issues</h3>
            <div className="flex flex-col gap-2">
              {problems.map((problem: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-gray-300 text-sm font-medium">{problem}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex gap-3">
              <button 
                onClick={async () => {
                  if (onFix) {
                    setFixing(true);
                    try {
                      await onFix();
                      setJustFixed(true);
                    } finally {
                      setFixing(false);
                    }
                  }
                }}
                disabled={fixing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {fixing ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {fixing ? 'Fixing...' : 'Fix Now'}
              </button>
              <button 
                onClick={onViewDetails}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg border border-white/10 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        )}

        {creativeClassification && creativeClassification !== 'N/A' && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Creative Classification</h3>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#111827] border border-white/5 rounded-xl">
              {creativeClassification === 'WINNER' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
              {creativeClassification === 'LOSER' && <XCircle className="w-5 h-5 text-red-400" />}
              {creativeClassification === 'FATIGUED' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
              {creativeClassification === 'TESTING' && <Activity className="w-5 h-5 text-blue-400" />}
              <span className="font-bold text-white tracking-wide">{creativeClassification}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
