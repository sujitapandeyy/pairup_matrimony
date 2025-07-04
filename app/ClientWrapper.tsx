'use client';

import React, { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import ProfileCards from './dashboard/ProfileCards';
import ChatInterface from './dashboard/ChatInterface';
import ProfilePage from './dashboard/profile/[userId]/page';
// your profile component

export default function ClientWrapper() {
  const [currentView, setCurrentView] = useState<'discover' | 'matches' | 'chat' | 'profile'>('discover');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('pairupUser');
    if (!user) {
      // handle redirect to login if needed
      setLoading(false);
    } else {
      const parsed = JSON.parse(user);
      setUserId(parsed._id);
      setLoading(false);
    }
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-25 to-red-50">
      {/* Pass props to NavBar */}
      <NavBar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {currentView === 'discover' && <ProfileCards />}
        {currentView === 'matches' && (
          <ChatInterface selectedChat={selectedChat} onSelectChat={setSelectedChat} />
        )}
        {currentView === 'profile' && userId && <ProfilePage userId={userId} />}
      </main>
    </div>
  );
}
