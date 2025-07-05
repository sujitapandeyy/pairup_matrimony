'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, X, MessageCircle, MapPin, Briefcase, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type RequestsProps = {
  requests: any[];
  setRequests: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentView: (view: 'discover' | 'matches' | 'chat' | 'profile' | 'requests') => void;
};


const backendUrl = "http://localhost:5050";

function getFullImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return null;
  if (imagePath.startsWith("/uploads/")) {
    return backendUrl + imagePath;
  }
  return imagePath;
}

const DEFAULT_AVATAR = '/defaultboy.jpg'; 

const Requests = ({ requests, setRequests, setCurrentView }: RequestsProps) => {
  const router = useRouter();

  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string>(DEFAULT_AVATAR);
  const [requestToRemoveAfterMatch, setRequestToRemoveAfterMatch] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('pairupUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        console.log('Stored user:', parsed);
        setEmail(parsed.email || null);

        const fullImage = getFullImageUrl(parsed.image);
        console.log('User image URL:', fullImage);
        setUserImage(fullImage || DEFAULT_AVATAR);
      } catch (error) {
        console.error('Failed to parse user:', error);
      }
    }
  }, []);

  const handleLikeBack = async (senderEmail: string) => {
    const targetRequest = requests[currentRequestIndex];

    try {
      const res = await fetch(`${backendUrl}/matches/swipe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swiper_email: email,
          target_email: senderEmail,
          liked: true,
        }),
      });

      if (res.ok) {
        const matchData = await res.json();
        if (matchData.match) {
          setMatchedProfile({
            name: targetRequest.sender_name,
            images: [getFullImageUrl(targetRequest.sender_image)],
            userImage: userImage,
          });
          setShowMatch(true);
          setRequestToRemoveAfterMatch(targetRequest._id);
        } else {
          const updated = requests.filter(r => r._id !== targetRequest._id);
          setRequests(updated);
          setCurrentRequestIndex(prev => Math.min(prev, updated.length - 1));
        }
      } else {
        toast.error('Failed to like back: Server error');
      }
    } catch (error) {
      console.error('Failed to like back:', error);
      toast.error('Failed to like back');
    }
  };

  const handleIgnore = async (notificationId: string) => {
    try {
      await fetch(`${backendUrl}/matches/ignore/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const updated = requests.filter(r => r._id !== notificationId);
      setRequests(updated);
      setCurrentRequestIndex(prev => Math.min(prev, updated.length - 1));
      toast.success('Request ignored');
    } catch (error) {
      console.error('Failed to ignore request:', error);
      toast.error('Failed to ignore request');
    }
  };

  const closeMatchModal = () => {
    setShowMatch(false);
    setMatchedProfile(null);
    if (requestToRemoveAfterMatch) {
      const updated = requests.filter(r => r._id !== requestToRemoveAfterMatch);
      setRequests(updated);
      setCurrentRequestIndex(prev => Math.min(prev, updated.length - 1));
      setRequestToRemoveAfterMatch(null);
    }
  };

  if (!email) return <div className="text-center py-10">Loading user...</div>;
  if (requests.length === 0) return <div className="text-center py-10">No requests at the moment.</div>;

  const currentRequest = requests[currentRequestIndex];
  const senderImage = getFullImageUrl(currentRequest.sender_image) || DEFAULT_AVATAR;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden shadow-2xl border-0 bg-white rounded-3xl transform transition-all duration-300 hover:scale-105">
          <div className="relative">
            {senderImage ? (
              <img src={senderImage} alt={currentRequest.sender_name} className="w-full h-96 object-cover" />
            ) : (
              <div className="w-full h-96 bg-gray-200 flex items-center justify-center text-gray-500">No Image</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h2 className="text-3xl font-bold mb-2">
                {currentRequest.sender_name}, {currentRequest.sender_age}
              </h2>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{(currentRequest.sender_location || '').split(' ').slice(0, 2).join(' ')}</span>
                </div>
                {currentRequest.sender_profession && (
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-sm">{currentRequest.sender_profession}</span>
                  </div>
                )}
                {currentRequest.sender_education && (
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-sm">{currentRequest.sender_education}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <p className="text-gray-700 mb-4">{currentRequest.message || 'This user liked your profile!'}</p>
            {currentRequest.sender_caption && <p className="text-gray-600 italic mb-4">{currentRequest.sender_caption}</p>}
            {Array.isArray(currentRequest.sender_personality) && currentRequest.sender_personality.length > 0 && (
              <div className="mt-2 mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Personality Traits</h3>
                <div className="flex flex-wrap gap-2">
                  {currentRequest.sender_personality.map((trait: string, index: number) => (
                    <span key={index} className="bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => handleIgnore(currentRequest._id)}
                variant="outline"
                size="lg"
                className="w-16 h-16 rounded-full border-2 border-gray-300 hover:border-red-400 hover:bg-red-50"
              >
                <X className="w-8 h-8 text-gray-500 hover:text-red-500" />
              </Button>
              <Button
                onClick={() => handleLikeBack(currentRequest.from)}
                size="lg"
                className="w-16 h-16 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg hover:scale-110"
              >
                <Heart className="w-8 h-8 text-white" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Modal */}
      {showMatch && matchedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center relative shadow-2xl">
            <button onClick={closeMatchModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Heart className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">It's a Match!</h2>
              <p className="text-gray-600">You and {matchedProfile.name} have liked each other</p>
            </div>

            <div className="flex items-center justify-center mb-6 space-x-4">
              {/* Logged-in User */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-blue-200">
                  {matchedProfile.userImage ? (
                    <img src={matchedProfile.userImage} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">You</div>
                  )}
                </div>
                <span className="mt-1 text-sm text-gray-600">You</span>
              </div>

              <Heart className="w-8 h-8 text-rose-500 animate-pulse" />

              {/* Matched User */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-pink-200">
                  {matchedProfile.images?.[0] ? (
                    <img src={matchedProfile.images[0]} alt={matchedProfile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">Match</div>
                  )}
                </div>
                <span className="mt-1 text-sm text-gray-600">{matchedProfile.name}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
  onClick={() => {
    setCurrentView('matches'); 
    closeMatchModal();
  }}
  className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold py-3 rounded-xl"
>
  <MessageCircle className="w-5 h-5 mr-2" />
  Start Chat
</Button>

              <Button variant="outline" onClick={closeMatchModal} className="w-full">
                Keep Swiping
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
