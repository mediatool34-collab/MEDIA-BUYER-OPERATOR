import React, { useState } from 'react';
import { Calculator, TrendingUp, Target, DollarSign, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

export function BudgetPlanner() {
  const [budget, setBudget] = useState(10000);
  const [targetRoas, setTargetRoas] = useState(2.5);
  const [cpc, setCpc] = useState(0.85);
  const [cvr, setCvr] = useState(2.0);

  const estimatedClicks = budget / cpc;
  const estimatedConversions = (estimatedClicks * cvr) / 100;
  const estimatedRevenue = estimatedConversions * (budget / estimatedConversions) * targetRoas; // Simplified
  const estimatedCpa = budget / estimatedConversions;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Budget Planner</h1>
          <p className="text-gray-400 mt-1">Forecast your performance and plan your monthly spend.</p>
        </div>
        <div className="flex items-center gap-3 bg-brand-accent/10 border border-brand-accent/20 px-4 py-2 rounded-xl">
          <Calendar className="w-5 h-5 text-brand-accent" />
          <span className="text-brand-accent font-bold uppercase tracking-widest text-sm">Next 30 Days</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-400" />
              Planning Inputs
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Monthly Budget ($)</label>
                <input 
                  type="number" 
                  value={budget} 
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="glass-input w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Target ROAS (x)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={targetRoas} 
                  onChange={(e) => setTargetRoas(Number(e.target.value))}
                  className="glass-input w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Estimated CPC ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={cpc} 
                  onChange={(e) => setCpc(Number(e.target.value))}
                  className="glass-input w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Conversion Rate (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={cvr} 
                  onChange={(e) => setCvr(Number(e.target.value))}
                  className="glass-input w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Forecast */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ForecastCard 
              title="Est. Revenue" 
              value={`$${(budget * targetRoas).toLocaleString()}`} 
              icon={TrendingUp} 
              color="text-green-400"
            />
            <ForecastCard 
              title="Est. Conversions" 
              value={Math.floor(estimatedConversions).toLocaleString()} 
              icon={Target} 
              color="text-blue-400"
            />
            <ForecastCard 
              title="Est. CPA" 
              value={`$${estimatedCpa.toFixed(2)}`} 
              icon={DollarSign} 
              color="text-purple-400"
            />
            <ForecastCard 
              title="Est. Clicks" 
              value={Math.floor(estimatedClicks).toLocaleString()} 
              icon={Calculator} 
              color="text-yellow-400"
            />
          </div>

          <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-white mb-4">AI Recommendation</h2>
              <p className="text-gray-400 leading-relaxed">
                Based on your target ROAS of <span className="text-white font-bold">{targetRoas}x</span>, we recommend focusing on <span className="text-blue-400 font-bold">Retargeting Audiences</span> to stabilize your CVR. 
                If your CPC exceeds <span className="text-red-400 font-bold">${(cpc * 1.2).toFixed(2)}</span>, your ROAS will likely drop below your target. 
                Consider diversifying into <span className="text-indigo-400 font-bold">TikTok Ads</span> if Meta CPCs continue to rise.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForecastCard({ title, value, icon: Icon, color }: { title: string, value: string, icon: any, color: string }) {
  return (
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors duration-500"></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</h3>
        <div className={cn("p-2 bg-white/5 rounded-xl border border-white/10", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-3xl font-bold text-white relative z-10">{value}</div>
    </div>
  );
}
