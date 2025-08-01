'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ProfileCards from '../../components/ProfileCards';

export default function DashboardPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [requests, setRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [liveUnreadCount, setLiveUnreadCount] = useState(0);

  useEffect(() => {
    const userStr = localStorage.getItem('pairupUser');
    console.log('Dashboard localStorage user:', userStr);
    if (!userStr) {
      toast.error('Please log in');
      router.push('/login');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      console.log('Parsed user:', user);

      const isCompleted =
        user.interests_completed === true || user.interests_completed === 'true';
      if (!isCompleted) {
        toast.warning('Complete your profile to continue');
        router.push('/interests');
        return;
      }

      // Use user.id (not user._id)
      setUserId(user.id || null);
      setUserEmail(user.email || null);
      setLoading(false);
    } catch (e) {
      toast.error('Failed to parse user');
      console.error('Error parsing user from localStorage:', e);
    }
  }, [router]);

  useEffect(() => {
    if (!userEmail) return;
    fetch(
      `http://localhost:5050/matches/notifications?email=${encodeURIComponent(
        userEmail
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        const requestNotifications = data.filter((n: any) => n.type === 'request');
        setRequests(requestNotifications || []);
      })
      .catch(() => toast.error('Failed to load match requests'));
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    fetch(
      `http://localhost:5050/matches/sent_requests?email=${encodeURIComponent(
        userEmail
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        setSentRequests(data.sentRequests || []);
      })
      .catch(() => toast.error('Failed to load sent requests'));
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
      <main className="max-w-full mx-auto px-4 py-8 "
      // style={{ backgroundImage: `url("img/bg1.jpg")`,     backgroundRepeat: "no-repeat", backgroundSize: "cover",backgroundPosition: "center" }}
      >
        <ProfileCards />
      </main>
    </div>
  );
}
