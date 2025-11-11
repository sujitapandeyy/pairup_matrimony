'use client';

import React, { useState, useEffect } from 'react';
import { Send, XCircle, Clock, MapPin, Briefcase } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Profile {
  id: string;
  name: string;
  email: string;
  age: number;
  location: string;
  photos: string[];
  profession?: string;
  compatibility_score?: number;
  created_at?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

function getFullImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return '/default-profile.jpg';
  if (imagePath.startsWith('/uploads/')) {
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${imagePath}`;
  }
  return imagePath;
}

function getTimeAgo(timestamp: string | Date | undefined) {
  if (!timestamp) return 'recently';
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

const getCompatibilityColor = (score: number): string => {
  if (score >= 90) return 'bg-emerald-600';
  if (score >= 80) return 'bg-green-600';
  if (score >= 70) return 'bg-lime-600';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 50) return 'bg-amber-500';
  if (score >= 40) return 'bg-orange-500';
  if (score >= 30) return 'bg-orange-600';
  if (score >= 20) return 'bg-red-500';
  return 'bg-red-700';
};

const SentRequests = () => {
  const router = useRouter();
  const [sentRequests, setSentRequests] = useState<Profile[] | null>(null);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [userEmail, setUserEmail] = useState<string>('');

  const fetchSentRequests = async () => {
    try {
      const userStr = localStorage.getItem('pairupUser');
      if (!userStr) {
        toast.error('Please log in');
        router.push('/login');
        return;
      }
      const user = JSON.parse(userStr);
      setUserEmail(user.email);
      
      const res = await api.get(`matches/sent_requests?email=${encodeURIComponent(user.email)}`);

      if (res.status === 200 && Array.isArray(res.data.sentRequests)) {
        // Filter out accepted requests - they should only appear in the Requests page
        const pendingRequests = res.data.sentRequests.filter(
          (r: Profile) => r.status !== 'accepted'
        );
        setSentRequests(pendingRequests);
      } else {
        setSentRequests([]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch sent requests');
      setSentRequests([]);
    }
  };

  useEffect(() => {
    fetchSentRequests();
  }, [router]);

  const handleCancel = async (profile: Profile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (processingRequests.has(profile.id)) return;
    setProcessingRequests((prev) => new Set(prev).add(profile.id));

    try {
      const userStr = localStorage.getItem('pairupUser');
      if (!userStr) return toast.error('User not logged in');
      const user = JSON.parse(userStr);

      const res = await api.post(`matches/sent_requests/cancel`, {
        swiper_email: user.email,
        target_email: profile.email,
      });

      if (res.status === 200) {
        toast.success('Request cancelled');
        
        // Auto-refresh after cancellation
        setTimeout(() => {
          fetchSentRequests();
        }, 300);
      } else {
        toast.error(res.data?.error || 'Cancel failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Cancel failed');
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleViewProfile = (profile: Profile) => {
    if (processingRequests.has(profile.id)) return;
    sessionStorage.setItem('lastViewedProfile', profile.email);
    router.push(`/user/${profile.id}`);
  };

  if (sentRequests === null) {
    return <div className="text-center py-10">Loading sent requests...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Sent Requests</h1>

      {sentRequests.length === 0 ? (
        <div className=" py-10 text-gray-500">All the sent requests appears here!</div>
      ) : (
        <div className="space-y-2">
          {sentRequests.map((profile) => {
            const isProcessing = processingRequests.has(profile.id);

            return (
              <div
                key={profile.id}
                onClick={() => handleViewProfile(profile)}
                className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-100 hover:border-yellow-200 ${
                  isProcessing ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <div className="p-4 flex items-start gap-3">
                  {/* Profile Photo */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-yellow-100">
                      <img
                        src={getFullImageUrl(profile.photos?.[0])}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                      <Send className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm leading-relaxed">
                      <span className="font-semibold hover:underline">
                        {profile.name}, {profile.age}
                      </span>
                    </p>

                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <Badge className="text-xs px-2 py-0.5 font-semibold bg-yellow-100 text-yellow-700">
                        Pending
                      </Badge>

                      {profile.compatibility_score && (
                        <Badge
                          className={`text-xs px-2 py-0.5 text-white font-semibold ${getCompatibilityColor(
                            profile.compatibility_score
                          )}`}
                        >
                          {Math.round(profile.compatibility_score)}% Compatible
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {profile.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{profile.location.split(' ').slice(0, 2).join(' ')}</span>
                        </div>
                      )}
                      {profile.profession && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          <span>{profile.profession}</span>
                        </div>
                      )}
                    </div>

                    {/* Cancel Button */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={(e) => handleCancel(profile, e)}
                        size="sm"
                        variant="outline"
                        disabled={isProcessing}
                        className="flex-1 rounded-lg border-red-300 hover:bg-red-50 text-red-700 h-8 text-xs font-semibold disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-700 border-t-transparent rounded-full animate-spin mr-1" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                        )}
                        Cancel Request
                      </Button>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 flex items-start gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3 mt-0.5" />
                    <span>{getTimeAgo(profile.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SentRequests;