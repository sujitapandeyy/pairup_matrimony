'use client';

import React, { useState, useEffect } from 'react';
import { Send, XCircle, Clock, MapPin, Briefcase } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { getFullImageUrl } from '@/lib/utils/image';
import { getTimeAgo } from '@/lib/utils/date';
import { getCompatibilityColor } from '@/lib/utils/match';
import type { Profile } from '@/types/allTypes';


const SentRequests = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sentRequests, setSentRequests] = useState<Profile[] | null>(null);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.email) {
      toast.error('Please log in to continue');
      router.push('/login');
      return;
    }

    const fetchSentRequests = async () => {
      if (!session.accessToken) {
          console.error('No access token available');
          toast.error('Session expired. Please log in again.');
          router.push('/login');
          return;
        }
      try {
        const res = await api.get(`/matches/sent_requests`, {
          params: { email: session.user.email },
        });

        if (res.status === 200 && Array.isArray(res.data.sentRequests)) {
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

    fetchSentRequests();
  }, [session, status, router]);

  const handleCancel = async (profile: Profile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (processingRequests.has(profile.id)) return;
    setProcessingRequests((prev) => new Set(prev).add(profile.id));

    try {
      const res = await api.post(`/matches/sent_requests/cancel`, {
        swiper_email: session?.user?.email,
        target_email: profile.email,
      });

      if (res.status === 200) {
        toast.success('Request cancelled');
        setTimeout(() => {
          setSentRequests((prev) => prev?.filter((p) => p.id !== profile.id) || []);
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

  if (status === 'loading' || sentRequests === null) {
return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Sent Requests</h1>

      {sentRequests.length === 0 ? (
        <div className="py-10 text-gray-500">All the sent requests appear here!</div>
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

                  <div className="flex-shrink-0 flex items-start gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3 mt-0.5" />
                    <span>{getTimeAgo(profile.created_at ?? new Date())}</span>
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
