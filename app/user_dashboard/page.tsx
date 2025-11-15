'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import ProfileCards from '../../components/ProfileCards';
import api from '@/lib/api'; // axios instance with baseURL configured

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Handle authentication + profile completion
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated' || !session?.user) {
      toast.error('Please log in');
      router.push('/login');
      return;
    }

    const user = session.user as any;

    if (
      user.interests_completed === false ||
      user.interests_completed === 'false'
    ) {
      toast.warning('Complete your profile to continue');
      router.push('/interests');
      return;
    }

    setUserId(user.id || null);
    setUserEmail(user.email || null);
    setLoading(false);
  }, [session, status, router]);

  // Fetch match requests
  useEffect(() => {
    if (!userEmail || !session?.accessToken) return;

    const fetchRequests = async () => {
      try {
        const res = await api.get(`/matches/notifications`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          params: { email: userEmail },
        });
        const data = res.data || [];
        const requestNotifications = data.filter((n: any) => n.type === 'request');
        setRequests(requestNotifications);
      } catch (error) {
        toast.error('Failed to load match requests');
      }
    };
    fetchRequests();
  }, [userEmail, session]);

  // Fetch sent requests
  useEffect(() => {
    if (!userEmail || !session?.accessToken) return;

    const fetchSentRequests = async () => {
      try {
        const res = await api.get(`/matches/sent_requests`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          params: { email: userEmail },
        });
        setSentRequests(res.data.sentRequests || []);
      } catch (error) {
        toast.error('Failed to load sent requests');
      }
    };
    fetchSentRequests();
  }, [userEmail, session]);

  if (loading || status === 'loading' || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-orange-50">
      <main className="max-w-full mx-auto px-4 py-8">
        <ProfileCards />
      </main>
    </div>
  );
}
