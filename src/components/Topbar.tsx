import React from 'react';
import { useAuth } from '../lib/auth';
import { signInWithGoogle, logOut } from '../lib/firebase';
import { LogIn, LogOut } from 'lucide-react';
import { AccountSelector } from './AccountSelector';
import { DateRangePicker } from './DateRangePicker';
import { useFilters } from '../lib/FilterContext';

export function Topbar() {
  const { user } = useAuth();
  const { platform, setPlatform, metaProfile } = useFilters();

  return (
    <header className="h-16 bg-brand-panel/80 backdrop-blur-md border-b border-brand-border flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center gap-4">
        {user && (
          <select 
            value={platform} 
            onChange={(e) => setPlatform(e.target.value)}
            className="glass-input text-sm py-1.5 px-3 bg-brand-panel/80"
          >
            <option value="meta">Meta Ads</option>
            <option value="google">Google Ads</option>
            <option value="tiktok">TikTok Ads</option>
          </select>
        )}
        {user && <AccountSelector />}
        {user && <DateRangePicker />}
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-brand-card/50 border border-brand-border pl-2 pr-4 py-1.5 rounded-full backdrop-blur-md">
              <img 
                src={metaProfile?.avatar || user.photoURL || ''} 
                alt="Avatar" 
                className="w-6 h-6 rounded-full ring-2 ring-brand-accent/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(metaProfile?.name || user.displayName || 'User')}&background=random`;
                }}
              />
              <span className="text-sm font-medium text-gray-200">{metaProfile?.name || user.displayName}</span>
            </div>
            <button
              onClick={logOut}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all active:scale-90"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-2 bg-brand-accent/20 border border-brand-accent/30 text-brand-accent px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-accent/30 transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            Sign In with Google
          </button>
        )}
      </div>
    </header>
  );
}
