import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface PerformanceChartProps {
  data: any[];
  type?: 'area' | 'bar';
  dataKey: string;
  color?: string;
}

const CustomTooltip = ({ active, payload, label, dataKey }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111827] border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-lg font-bold text-white">
          {dataKey === 'roas' ? `${payload[0].value.toFixed(2)}x` : 
           dataKey === 'spend' || dataKey === 'revenue' ? `$${payload[0].value.toLocaleString()}` : 
           payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function PerformanceChart({ data, type = 'area', dataKey, color = '#3b82f6' }: PerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
        Insufficient data for visualization
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
        {type === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 10 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 10 }} 
            />
            <Tooltip content={<CustomTooltip dataKey={dataKey} />} />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorGradient)" 
              animationDuration={1500}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 10 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 10 }} 
            />
            <Tooltip content={<CustomTooltip dataKey={dataKey} />} />
            <Bar 
              dataKey={dataKey} 
              fill={color} 
              radius={[4, 4, 0, 0]} 
              animationDuration={1500}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
