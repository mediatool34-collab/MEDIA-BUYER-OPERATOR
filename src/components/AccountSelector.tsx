import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { useFilters } from '../lib/FilterContext';

export function AccountSelector() {
  const { adAccounts, selectedAccountId, setSelectedAccountId, metaToken, loadingAccounts } = useFilters();
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

  if (!metaToken) return null;

  const currentAccount = adAccounts.find(a => a.id === selectedAccountId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={loadingAccounts}
        className={`flex items-center gap-2 bg-[#111827] border border-white/10 px-4 py-1.5 rounded-lg text-sm font-medium text-gray-200 hover:bg-white/5 transition-colors ${loadingAccounts ? 'opacity-50 cursor-wait' : ''}`}
      >
        {loadingAccounts ? (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Building2 className="w-4 h-4 text-blue-400" />
        )}
        <span className="max-w-[150px] truncate">
          {loadingAccounts ? 'Loading...' : (currentAccount ? currentAccount.name : 'Select Account')}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !loadingAccounts && (
        <div className="absolute right-0 mt-2 w-64 bg-[#0B0F19] border border-white/10 rounded-xl shadow-xl z-50 py-2 backdrop-blur-md">
          <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            Ad Accounts
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {adAccounts.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">No accounts found</div>
            ) : (
              adAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors ${
                    selectedAccountId === account.id ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500' : 'text-gray-300'
                  }`}
                >
                  <div className="font-medium truncate">{account.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">ID: {account.account_id || account.id}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
