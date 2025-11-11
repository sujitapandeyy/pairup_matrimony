'use client';

import React, { useEffect, useState } from 'react';
import SentRequests from '@/components/SentRequests';
import { toast } from 'sonner';
import api from '@/lib/api'; // ✅ using your api instance

interface Profile {
  id: string;
  name: string;
  email: string;
  age: number;
  location: string;
  photos: string[];
}

export default function InterestsPage() {
  const [sentRequests, setSentRequests] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSentRequests() {
      try {
        const userStr = localStorage.getItem('pairupUser');
        if (!userStr) {
          toast.error('Please log in');
          setLoading(false);
          return;
        }

        const user = JSON.parse(userStr);
        // ✅ using only endpoint (no full URL)
        const res = await api.get(`/matches/sent_requests`, {
          params: { email: user.email },
        });

        setSentRequests(res.data.sentRequests || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load sent requests');
      } finally {
        setLoading(false);
      }
    }

    fetchSentRequests();
  }, []);

  const handleCancel = (email: string) => {
    setSentRequests((prev) => prev.filter((p) => p.email !== email));
  };

//   if (loading) {
//     return (
//     //   <div className="flex justify-center items-center h-80 text-gray-500">
//     //     Loading sent requests...
//     //   </div>
//     );
//   }

  return (
    <div className="py-1">
      <SentRequests sentRequests={sentRequests} onCancel={handleCancel} />
    </div>
  );
}
