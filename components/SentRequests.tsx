'use client';

import React, { useState, useEffect } from 'react';
import { Send, XCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import api from '@/lib/api'
interface Profile {
  id: string;
  name: string;
  email: string;
  age: number;
  location: string;
  photos: string[];
}

const SentRequests = () => {
    const router = useRouter();
  
  const [sentRequests, setSentRequests] = useState<Profile[] | null>(null); // null = loading
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSentRequests = async () => {
      try {
        const userStr = localStorage.getItem('pairupUser');
        if (!userStr) {
        toast.error('Please log in');
        router.push('/login');
              // setSentRequests([]);
          return;
        }

        const user = JSON.parse(userStr);
                // const response = await api.get('/api/users')
        const res = await api.get(`matches/sent_requests?email=${encodeURIComponent(user.email)}`);

        if (res.status === 200 && Array.isArray(res.data.sentRequests)) {
          setSentRequests(res.data.sentRequests);
        } else {
          setSentRequests([]);
          setError(null);
        }
      } catch (err) {
        toast.error('Failed to fetch sent requests');
        setSentRequests([]);
        toast.error('Failed to load sent requests');
      }
    };

    fetchSentRequests();
  }, []);

  const handleCancel = async (email: string) => {
    try {
      const userStr = localStorage.getItem('pairupUser');
      if (!userStr) {
        toast.error('User not logged in');
        return;
      }
      const user = JSON.parse(userStr);
// const res = await api.get(`matches/sent_requests?email=${encodeURIComponent(user.email)}`);

//         if (res.status === 200 && Array.isArray(res.data.sentRequests)) {
          // setSentRequests(res.data.sentRequests);
      const res = await api.post(`matches/sent_requests/cancel`, {
        swiper_email: user.email,
        target_email: email,
      });

      if (res.status === 200) {
        toast.success('Request cancelled');
        setSentRequests((prev) => prev?.filter((p) => p.email !== email) || []);
      } else {
        toast.error(res.data?.error || 'Cancel failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Cancel failed');
    }
  };

  if (sentRequests === null) {
    return <div className="max-w-4xl mx-auto py-8 px-4 text-center">Loading sent requests...</div>;
  }

  if (error) {
    return <div className="max-w-4xl mx-auto py-8 px-4 text-center text-red-600">{error}</div>;
  }

  if (sentRequests.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-center">
        <Send className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">No sent requests</h2>
        <p className="text-gray-500">Start discovering profiles to send interest!</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Sent Requests</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sentRequests.map((profile) => (
          <Card key={profile.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-square bg-gradient-to-br from-pink-100 to-purple-100">
              <img
                src={profile.photos?.[0] ?? '/default-profile.png'}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg">
                {profile.name}, {profile.age}
              </h3>
              <p className="text-gray-600 text-sm mb-2">
                {(profile.location ?? '').split(' ').slice(0, 2).join(' ')}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Badge className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full whitespace-nowrap">
                  Request Pending
                </Badge>
                <button
                  onClick={() => handleCancel(profile.email)}
                  className="flex items-center gap-1 text-sm font-medium text-red-700 hover:bg-red-100 bg-red-50 rounded-full px-3 py-1"
                  type="button"
                >
                  <XCircle size={16} />
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SentRequests;
