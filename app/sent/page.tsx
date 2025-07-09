'use client'

import React, { useEffect, useState } from "react";
import SentRequests from "@/components/SentRequests";
import { toast } from "sonner";

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
        const user = localStorage.getItem('pairupUser');
        if (!user) {
          toast.error('User not logged in');
          setSentRequests([]);
          setLoading(false);
          return;
        }
        const parsed = JSON.parse(user);
        const res = await fetch(`http://localhost:5050/matches/sent_requests?email=${encodeURIComponent(parsed.email)}`);
        if (!res.ok) throw new Error('Failed to fetch sent requests');
        const data = await res.json();
        setSentRequests(data.sentRequests || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load sent requests');
      } finally {
        setLoading(false);
      }
    }
    fetchSentRequests();
  }, []);

  // Remove cancelled request from UI after cancelling
  const handleCancel = (email: string) => {
    setSentRequests((prev) => prev.filter((p) => p.email !== email));
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600">Loading sent requests...</p>
      </div>
    );
  }

  return <SentRequests sentRequests={sentRequests} onCancel={handleCancel} />;
}
