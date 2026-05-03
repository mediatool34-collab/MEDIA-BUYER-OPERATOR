import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, LogOut, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { logOut, db } from '../lib/firebase';
import { doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export function Settings() {
  const { user } = useAuth();
  const [metaConnected, setMetaConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.platform && event.data?.token) {
        if (user) {
          try {
            const path = `users/${user.uid}/tokens/${event.data.platform}`;
            await setDoc(doc(db, 'users', user.uid, 'tokens', event.data.platform), {
              accessToken: event.data.token,
              updatedAt: new Date().toISOString()
            });
            if (event.data.platform === 'meta') setMetaConnected(true);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/tokens/${event.data.platform}`);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  useEffect(() => {
    if (user) {
      const path = `users/${user.uid}/tokens/meta`;
      getDoc(doc(db, 'users', user.uid, 'tokens', 'meta'))
        .then(docSnap => {
          if (docSnap.exists() && docSnap.data().accessToken) {
            setMetaConnected(true);
          }
          setLoading(false);
        })
        .catch(err => {
          handleFirestoreError(err, OperationType.GET, path);
          setLoading(false);
        });
    } else {
      Promise.resolve().then(() => {
        if (loading) setLoading(false);
      });
    }
  }, [user, loading]);

  const handleDisconnectMeta = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'tokens', 'meta'));
      setMetaConnected(false);
    } catch (error) {
      console.error('Error disconnecting Meta:', error);
    }
  };

  const handleConnectMeta = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/auth/connect/meta?uid=${user?.uid}&json=true`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to get auth URL');
      }
      const { url } = await response.json();
      window.open(url, 'oauth_popup', 'width=600,height=700');
    } catch (error: any) {
      console.error('Error connecting Meta:', error);
      alert('Error: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Account Profile</h2>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full border-2 border-white/10" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 text-xl font-bold">
                {user?.email?.[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-medium text-white text-lg">{user?.displayName || 'User'}</div>
              <div className="text-gray-400">{user?.email}</div>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Connected Platforms</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#111827]/50 border border-white/5 rounded-xl shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1877F2] rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">f</div>
                <div>
                  <div className="font-medium text-white">Meta Ads</div>
                  <div className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                    {metaConnected ? (
                      <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Connected</>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5 text-gray-500" /> Not connected</>
                    )}
                  </div>
                </div>
              </div>
              {metaConnected ? (
                <button onClick={handleDisconnectMeta} className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all duration-200">
                  Disconnect
                </button>
              ) : (
                <button onClick={handleConnectMeta} className="px-4 py-2 text-sm font-medium bg-[#1877F2] text-white hover:bg-[#1877F2]/90 rounded-lg shadow-[0_0_10px_rgba(24,119,242,0.3)] transition-all duration-200">
                  Connect
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-[#111827]/30 border border-white/5 rounded-xl opacity-60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center font-bold text-xl text-gray-900">G</div>
                <div>
                  <div className="font-medium text-white">Google Ads</div>
                  <div className="text-sm text-gray-500 mt-0.5">Coming soon</div>
                </div>
              </div>
              <button disabled className="px-4 py-2 text-sm font-medium bg-white/5 text-gray-500 rounded-lg cursor-not-allowed border border-white/5">
                Connect
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#111827]/30 border border-white/5 rounded-xl opacity-60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black border border-white/10 rounded-lg flex items-center justify-center text-white font-bold text-xl">d</div>
                <div>
                  <div className="font-medium text-white">TikTok Ads</div>
                  <div className="text-sm text-gray-500 mt-0.5">Coming soon</div>
                </div>
              </div>
              <button disabled className="px-4 py-2 text-sm font-medium bg-white/5 text-gray-500 rounded-lg cursor-not-allowed border border-white/5">
                Connect
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#0B0F19]/50">
          <button 
            onClick={logOut}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 font-medium px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors -ml-4"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
