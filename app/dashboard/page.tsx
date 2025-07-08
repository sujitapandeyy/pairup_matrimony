'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import ProfileCards from './ProfileCards';
import ProfilePage from '@/components/ProfilePage';
import Requests from '@/components/Request';
import ChatInterface from '../../components/ChatInterface';
import SentRequests from '@/components/SentRequests';
import { toast } from 'sonner';

interface Match {
  name: string;
  email: string;
  images: string[];
  lastMessage?: string;
  lastTimestamp?: string;
  lastSender?: string;
}

interface Profile {
  id: string;
  name: string;
  age: number;
  location: string;
  photos: string[];
  email: string;
}

const Page = () => {
  const router = useRouter();

  const [currentView, setCurrentView] = useState<
    | 'discover'
    | 'matches'
    | 'chat'
    | 'profile'
    | 'requests'
    | 'sent'
  >('discover');
  const [selectedChat, setSelectedChat] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [requests, setRequests] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, string>>({});
  const [liveUnreadCount, setLiveUnreadCount] = useState(0);

  const [sentRequests, setSentRequests] = useState<Profile[]>([]);

  // Load currentView from localStorage
  useEffect(() => {
    const storedView = localStorage.getItem('currentView');
    if (storedView) setCurrentView(storedView as any);
  }, []);

  // Save currentView to localStorage
  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  // Load logged-in user info
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

  // Fetch match requests notifications
  useEffect(() => {
    if (!userEmail) return;
    fetch(`http://localhost:5050/matches/notifications?email=${encodeURIComponent(userEmail)}`)
      .then((res) => res.json())
      .then((data) => {
        const requestNotifications = data.filter((n: any) => n.type === 'request');
        setRequests(requestNotifications || []);
      })
      .catch((err) => {
        console.error('Failed to load notifications', err);
        toast.error('Failed to load match requests');
      });
  }, [userEmail]);

  // Fetch mutual matches with last message info
  useEffect(() => {
    if (!userEmail) return;

    async function fetchMatches() {
      try {
        const res = await fetch(
          `http://localhost:5050/matches/get_mutual_matches?email=${encodeURIComponent(userEmail ?? '')}`
        );
        const data = await res.json();

        const matchesWithMeta: Match[] = await Promise.all(
          data.matches.map(async (match: Match) => {
            const chatRes = await fetch(
              `http://localhost:5050/chat/history?user1=${encodeURIComponent(userEmail ?? '')}&user2=${encodeURIComponent(match.email)}`
            );
            const chatData = await chatRes.json();
            const lastMsg = chatData.messages?.[chatData.messages.length - 1];
            return {
              ...match,
              lastMessage: lastMsg?.message || '',
              lastTimestamp: lastMsg?.timestamp || '',
              lastSender: lastMsg?.sender || '',
            };
          })
        );

        setMatches(matchesWithMeta);
      } catch (err) {
        console.error('Failed to fetch matches', err);
        toast.error('Failed to fetch matches');
      }
    }

    fetchMatches();
  }, [userEmail]);

  // Fetch sent requests
  useEffect(() => {
    if (!userEmail) return;

    fetch(`http://localhost:5050/matches/sent_requests?email=${encodeURIComponent(userEmail)}`)
      .then((res) => res.json())
      .then((data) => {
        setSentRequests(data.sentRequests || []);
      })
      .catch((err) => {
        console.error('Failed to load sent requests', err);
        toast.error('Failed to load sent requests');
      });
  }, [userEmail]);

  // Update lastReadTimestamps when user selects a chat
  useEffect(() => {
    if (selectedChat && selectedChat.lastTimestamp) {
      setLastReadTimestamps((prev) => ({
        ...prev,
        [selectedChat.email]: selectedChat.lastTimestamp || '',
      }));
    }
  }, [selectedChat]);

  // Calculate unread message count and update liveUnreadCount state
  useEffect(() => {
    const count = matches.reduce((acc, match) => {
      if (
        match.lastMessage &&
        match.lastSender !== userEmail &&
        (!lastReadTimestamps[match.email] ||
          new Date(match.lastTimestamp || '').getTime() > new Date(lastReadTimestamps[match.email] || '').getTime())
      ) {
        return acc + 1;
      }
      return acc;
    }, 0);
    setLiveUnreadCount(count);
  }, [matches, lastReadTimestamps, userEmail]);

  if (loading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-indigo-50">
      {/* <Toaster position="top-center" richColors /> */}
      <NavBar
        currentView={currentView}
        setCurrentView={setCurrentView}
        requestCount={requests.length}
        unreadMessageCount={liveUnreadCount}
        sentRequestCount={sentRequests.length}
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {currentView === 'discover' && <ProfileCards />}
        {currentView === 'matches' && (
          <ChatInterface
            onSelectChat={setSelectedChat}
            selectedChat={selectedChat}
            onUnreadCountChange={setLiveUnreadCount}
          />
        )}
        {currentView === 'profile' && <ProfilePage userId={userId} />}
        {currentView === 'requests' && (
          <Requests
            requests={requests}
            setRequests={setRequests}
            setCurrentView={setCurrentView}
          />
        )}
        {currentView === 'sent' && (
          <SentRequests
            sentRequests={sentRequests}
            onCancel={(email) => {
              setSentRequests((prev) => prev.filter((p) => p.email !== email));
            }}
          />
        )}
      </main>
    </div>
  );
};

export default Page;
