'use client';

import React from 'react';
import { Send, XCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface Profile {
  id: string;
  name: string;
  email: string;
  age: number;
  location: string;
  photos: string[];
}

interface SentRequestsProps {
  sentRequests: Profile[];
  onCancel?: (email: string) => void;
}

const SentRequests = ({ sentRequests, onCancel }: SentRequestsProps) => {
  const handleCancel = async (email: string) => {
    try {
      const user = localStorage.getItem('pairupUser');
      if (!user) return toast.error('User not logged in');
      const parsed = JSON.parse(user);

      const res = await fetch(`http://localhost:5050/matches/sent_requests/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swiper_email: parsed.email,
          target_email: email,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Request cancelled');
        onCancel?.(email);
      } else {
        toast.error(data.error || 'Cancel failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Cancel failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Sent Requests</h1>
      {sentRequests.length === 0 ? (
        <div className="text-center py-12">
          <Send className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No sent requests</h2>
          <p className="text-gray-500">Start discovering profiles to send interest!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sentRequests.map((profile) => (
            <Card key={profile.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-gradient-to-br from-pink-100 to-purple-100">
                <img
                  src={profile.photos[0]}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg">{profile.name}, {profile.age}</h3>
                <p className="text-gray-600 text-sm mb-2">{(profile.location || '').split(' ').slice(0, 2).join(' ')}</p>
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
      )}
    </div>
  );
};

export default SentRequests;
