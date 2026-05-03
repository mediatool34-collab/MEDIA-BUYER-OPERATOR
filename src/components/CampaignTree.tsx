import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, Target, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface CampaignTreeProps {
  campaigns: any[];
  adsets: any[];
  ads: any[];
  selectedId: string | null;
  onSelect: (item: any, type: 'campaign' | 'adset' | 'ad') => void;
}

export function CampaignTree({ campaigns, adsets, ads, selectedId, onSelect }: CampaignTreeProps) {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set());

  const toggleCampaign = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedCampaigns);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedCampaigns(newSet);
  };

  const toggleAdset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedAdsets);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedAdsets(newSet);
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-white/5 bg-[#111827]/50">
        <h2 className="font-bold text-white flex items-center gap-2">
          <Folder className="w-4 h-4 text-blue-400" />
          Campaign Structure
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {campaigns.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">No campaigns found</div>
        )}
        {campaigns.map(campaign => {
          const campaignAdsets = adsets.filter(a => a.campaignId === campaign.id);
          const isExpanded = expandedCampaigns.has(campaign.id);
          const isSelected = selectedId === campaign.id;

          return (
            <div key={campaign.id} className="mb-1">
              <div 
                className={cn(
                  "flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all duration-200 group",
                  isSelected ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]" : "hover:bg-white/5 text-gray-300 border border-transparent"
                )}
                onClick={() => onSelect(campaign, 'campaign')}
              >
                <button onClick={(e) => toggleCampaign(campaign.id, e)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>
                <Folder className={cn("w-4 h-4", isSelected ? "text-blue-400" : "text-gray-500 group-hover:text-gray-400")} />
                <span className="text-sm font-medium truncate flex-1">{campaign.name}</span>
                <StatusBadge status={campaign.status} />
              </div>

              {isExpanded && (
                <div className="ml-6 pl-3 border-l border-white/10 mt-1 space-y-1">
                  {campaignAdsets.map(adset => {
                    const adsetAds = ads.filter(a => a.adsetId === adset.id);
                    const isAdsetExpanded = expandedAdsets.has(adset.id);
                    const isAdsetSelected = selectedId === adset.id;

                    return (
                      <div key={adset.id}>
                        <div 
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all duration-200 group",
                            isAdsetSelected ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]" : "hover:bg-white/5 text-gray-400 border border-transparent"
                          )}
                          onClick={() => onSelect(adset, 'adset')}
                        >
                          <button onClick={(e) => toggleAdset(adset.id, e)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                            {isAdsetExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                          </button>
                          <Target className={cn("w-4 h-4", isAdsetSelected ? "text-blue-400" : "text-gray-500 group-hover:text-gray-400")} />
                          <span className="text-sm truncate flex-1">{adset.name}</span>
                          <StatusBadge status={adset.status} />
                        </div>

                        {isAdsetExpanded && (
                          <div className="ml-6 pl-3 border-l border-white/10 mt-1 space-y-1">
                            {adsetAds.map(ad => {
                              const isAdSelected = selectedId === ad.id;
                              return (
                                <div 
                                  key={ad.id}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all duration-200 group",
                                    isAdSelected ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]" : "hover:bg-white/5 text-gray-400 border border-transparent"
                                  )}
                                  onClick={() => onSelect(ad, 'ad')}
                                >
                                  <div className="w-6" /> {/* Spacer */}
                                  <ImageIcon className={cn("w-4 h-4", isAdSelected ? "text-blue-400" : "text-gray-500 group-hover:text-gray-400")} />
                                  <span className="text-sm truncate flex-1">{ad.name}</span>
                                  <StatusBadge status={ad.status} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') return <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" title="Active" />;
  if (status === 'PAUSED') return <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]" title="Paused" />;
  if (status === 'ARCHIVED') return <div className="w-2 h-2 rounded-full bg-gray-500" title="Archived" />;
  return <div className="w-2 h-2 rounded-full bg-gray-600" title="Unknown" />;
}
