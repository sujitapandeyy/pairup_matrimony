'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Heart, User, X, Bell } from 'lucide-react';

type NavBarProps = {
  currentView: 'discover' | 'matches' | 'chat' | 'profile' | 'requests';
  setCurrentView: (view: NavBarProps['currentView']) => void;
  requestCount: number;
  unreadMessageCount: number;
};

const NavBar = ({
  currentView,
  setCurrentView,
  requestCount,
  unreadMessageCount,
}: NavBarProps) => {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('pairupUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.name) setUserName(user.name);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const onLogout = () => {
    localStorage.removeItem('pairupUser');
    router.push('/login');
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-pink-100">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            Pair-Up
          </h1>
        </div>

        <nav className="flex items-center space-x-6">
          <button
            onClick={() => setCurrentView('discover')}
            className={`p-2 rounded-full transition-colors ${
              currentView === 'discover'
                ? 'bg-rose-100 text-rose-600'
                : 'text-gray-600 hover:text-rose-600'
            }`}
            aria-label="Discover"
          >
            <Heart className="w-6 h-6" />
          </button>

          <button
            onClick={() => setCurrentView('matches')}
            className={`relative p-2 rounded-full transition-colors ${
              currentView === 'matches'
                ? 'bg-rose-100 text-rose-600'
                : 'text-gray-600 hover:text-rose-600'
            }`}
            aria-label="Matches"
          >
            <MessageCircle className="w-6 h-6" />
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5">
                {unreadMessageCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('requests')}
            className={`relative p-2 rounded-full transition-colors ${
              currentView === 'requests'
                ? 'bg-rose-100 text-rose-600'
                : 'text-gray-600 hover:text-rose-600'
            }`}
            aria-label="Requests"
          >
            <Bell className="w-6 h-6" />
            {requestCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5">
                {requestCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('profile')}
            className={`p-2 rounded-full transition-colors ${
              currentView === 'profile'
                ? 'bg-rose-100 text-rose-600'
                : 'text-gray-600 hover:text-rose-600'
            }`}
            aria-label="Profile"
          >
            <User className="w-6 h-6" />
          </button>

          <button
            onClick={onLogout}
            className="text-gray-900 hover:text-gray-600 transition-colors"
            title="Logout"
            aria-label="Logout"
          >
            <X className="w-6 h-6" />
          </button>
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
