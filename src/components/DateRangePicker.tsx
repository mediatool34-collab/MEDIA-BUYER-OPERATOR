import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useFilters } from '../lib/FilterContext';

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last_7d' },
  { label: 'Last 14 days', value: 'last_14d' },
  { label: 'Last 28 days', value: 'last_28d' },
  { label: 'Last 30 days', value: 'last_30d' },
  { label: 'This week', value: 'this_week' },
  { label: 'Last week', value: 'last_week' },
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: 'Maximum', value: 'maximum' },
];

export function DateRangePicker() {
  const { datePreset, setDatePreset } = useFilters();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLabel = PRESETS.find(p => p.value === datePreset)?.label || 'Select Date';

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#111827] border border-white/10 px-4 py-1.5 rounded-lg text-sm font-medium text-gray-200 hover:bg-white/5 transition-colors"
      >
        <Calendar className="w-4 h-4 text-blue-400" />
        {currentLabel}
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#0B0F19] border border-white/10 rounded-xl shadow-xl z-50 py-2 backdrop-blur-md">
          <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            Date range presets
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => {
                  setDatePreset(preset.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${
                  datePreset === preset.value ? 'bg-blue-500/10 text-blue-400 font-medium border-l-2 border-blue-500' : 'text-gray-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
