'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import ProfileCards from './ProfileCards';
import ProfilePage from '@/components/ProfilePage';
import Requests from '@/components/Request';
import ChatInterface from '../../components/ChatInterface';
import { toast, Toaster } from 'sonner';

const Page = () => {
  const router = useRouter();

  const [currentView, setCurrentView] = useState<'discover' | 'matches' | 'chat' | 'profile' | 'requests'>('discover');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const storedView = localStorage.getItem('currentView');
    if (storedView) setCurrentView(storedView as any);
  }, []);

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    const user = localStorage.getItem('pairupUser');
    if (!user) {
      toast.error('Please log in');
      router.push('/login');
    } else {
      try {
        const parsed = JSON.parse(user);
        const isCompleted = parsed.interests_completed === true || parsed.interests_completed === 'true';

        if (!isCompleted) {
          toast.warning('Complete your profile to continue');
          router.push('/interests');
        } else {
          setUserId(parsed._id || parsed.id || null);
          setUserEmail(parsed.email || null);
          setLoading(false);
        }
      } catch (err) {
        toast.error('Failed to parse user');
      }
    }
  }, [router]);

  useEffect(() => {
    if (!userEmail) return;
    fetch(`http://localhost:5050/matches/notifications?email=${encodeURIComponent(userEmail)}`)
      .then(res => res.json())
      .then(data => {
        const requestNotifications = data.filter((n: any) => n.type === 'request');
        setRequests(requestNotifications || []);
      })
      .catch(err => {
        console.error("Failed to load notifications", err);
        toast.error('Failed to load match requests');
      });
  }, [userEmail]);

  if (loading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-indigo-50">
      <Toaster position="top-center" richColors />
      <NavBar
        currentView={currentView}
        setCurrentView={setCurrentView}
        requestCount={requests.length}
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {currentView === 'discover' && <ProfileCards />}
        {currentView === 'matches' && (
          <ChatInterface onSelectChat={setSelectedChat} selectedChat={selectedChat} />
        )}
        {currentView === 'profile' && <ProfilePage userId={userId} />}
        {currentView === 'requests' && (
          <Requests
            requests={requests}
            setRequests={setRequests}
            setCurrentView={setCurrentView} // 🔥 passed here
          />
        )}
      </main>
    </div>
  );
};

export default Page;
