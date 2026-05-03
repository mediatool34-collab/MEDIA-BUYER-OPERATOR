import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

interface FilterContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  datePreset: string;
  setDatePreset: (preset: string) => void;
  adAccounts: any[];
  metaToken: string | null;
  googleToken: string | null;
  tiktokToken: string | null;
  platform: string;
  setPlatform: (platform: string) => void;
  metaProfile: { name: string, avatar: string } | null;
  loadingAccounts: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(() => {
    return localStorage.getItem('selectedAccountId');
  });
  const [datePreset, setDatePreset] = useState('last_30d');
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [metaToken, setMetaToken] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [tiktokToken, setTiktokToken] = useState<string | null>(null);
  const [platform, setPlatform] = useState('meta');
  const [metaProfile, setMetaProfile] = useState<{ name: string, avatar: string } | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const setSelectedAccountId = (id: string | null) => {
    setSelectedAccountIdState(id);
    if (id) {
      localStorage.setItem('selectedAccountId', id);
    } else {
      localStorage.removeItem('selectedAccountId');
    }
  };

  useEffect(() => {
    // Current selected account sync
  }, [selectedAccountId]);

  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => {
        setMetaToken(null);
        setGoogleToken(null);
        setTiktokToken(null);
        setAdAccounts([]);
        setSelectedAccountId(null);
        setMetaProfile(null);
      });
      return;
    }

    // Real-time listeners for tokens
    const unsubMeta = onSnapshot(doc(db, 'users', user.uid, 'tokens', 'meta'), (docSnap) => {
      if (docSnap.exists()) setMetaToken(docSnap.data().accessToken);
      else setMetaToken(null);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/tokens/meta`);
    });

    const unsubGoogle = onSnapshot(doc(db, 'users', user.uid, 'tokens', 'google'), (docSnap) => {
      if (docSnap.exists()) setGoogleToken(docSnap.data().accessToken);
      else setGoogleToken(null);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/tokens/google`);
    });

    const unsubTiktok = onSnapshot(doc(db, 'users', user.uid, 'tokens', 'tiktok'), (docSnap) => {
      if (docSnap.exists()) setTiktokToken(docSnap.data().accessToken);
      else setTiktokToken(null);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/tokens/tiktok`);
    });

    return () => {
      unsubMeta();
      unsubGoogle();
      unsubTiktok();
    };
  }, [user]);

  // Fetch Meta Profile Info
  useEffect(() => {
    if (metaToken) {
      fetch(`https://graph.facebook.com/me?fields=name,picture.type(large)&access_token=${metaToken}`)
        .then(res => res.json())
        .then(data => {
          if (data.name && data.picture) {
            setMetaProfile({
              name: data.name,
              avatar: data.picture.data.url
            });
          }
        })
        .catch(err => console.error('Error fetching Meta profile:', err));
    } else {
      Promise.resolve().then(() => {
        setMetaProfile(null);
      });
    }
  }, [metaToken]);

  // Fetch Ad Accounts
  useEffect(() => {
    if (!user) return;
    
    let currentToken = null;
    if (platform === 'meta') currentToken = metaToken;
    if (platform === 'google') currentToken = googleToken;
    if (platform === 'tiktok') currentToken = tiktokToken;

    if (currentToken) {
      Promise.resolve().then(() => setLoadingAccounts(true));
      fetch(`/api/adaccounts?platform=${platform}`, {
        headers: { 
          'x-user-id': user.uid,
          [`x-${platform}-token`]: currentToken
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.accounts && data.accounts.length > 0) {
          setAdAccounts(data.accounts);
          
          // Persistence Logic:
          // 1. Check if current selectedAccountId is valid in the new list
          // 2. If not, check localStorage
          // 3. If still not valid, default to first account
          
          const savedId = localStorage.getItem('selectedAccountId');
          const isCurrentValid = data.accounts.some((a: any) => a.id === selectedAccountId);
          const isSavedValid = savedId && data.accounts.some((a: any) => a.id === savedId);
          
          if (!isCurrentValid) {
            if (isSavedValid) {
              setSelectedAccountId(savedId);
            } else {
              setSelectedAccountId(data.accounts[0].id);
            }
          }
        } else {
          setAdAccounts([]);
          setSelectedAccountId(null);
        }
      })
      .catch(err => console.error('Error fetching ad accounts:', err))
      .finally(() => setLoadingAccounts(false));
    } else {
      Promise.resolve().then(() => {
        setAdAccounts([]);
        setSelectedAccountId(null);
      });
    }
    // We intentionally exclude selectedAccountId from dependencies to prevent reset loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, platform, metaToken, googleToken, tiktokToken]);

  return (
    <FilterContext.Provider value={{ 
      selectedAccountId, 
      setSelectedAccountId, 
      datePreset, 
      setDatePreset, 
      adAccounts,
      metaToken,
      googleToken,
      tiktokToken,
      platform,
      setPlatform,
      metaProfile,
      loadingAccounts
    }}>
      {children}
    </FilterContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within FilterProvider');
  return context;
}
