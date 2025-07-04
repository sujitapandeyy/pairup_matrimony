'use client';

import React, { useEffect, useState } from 'react';
import { Heart, X, MessageCircle, MapPin, Briefcase, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Requests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string>('/default-profile.jpg');
  const [requestToRemoveAfterMatch, setRequestToRemoveAfterMatch] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('pairupUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.email) setEmail(parsed.email);
        if (parsed?.image) setUserImage(parsed.image);
      } catch (err) {
        console.error('Error parsing user from localStorage');
      }
    }
  }, []);

  useEffect(() => {
    if (!email) return;

    fetch(`http://localhost:5050/matches/notifications?email=${encodeURIComponent(email)}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        const requestNotifications = data.filter((note: any) => note.type === 'request');
        setRequests(requestNotifications);
        setCurrentRequestIndex(0);
      })
      .catch((err) => console.error('Failed to fetch requests', err));
  }, [email]);

  const handleLikeBack = async (senderEmail: string) => {
    const targetRequest = requests[currentRequestIndex];

    try {
      const res = await fetch('http://localhost:5050/matches/swipe', {
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
            images: [targetRequest.sender_image ? `http://localhost:5050/${targetRequest.sender_image}` : '/default-profile.jpg'],
            location: targetRequest.sender_location,
            userImage: userImage || '/default-profile.jpg',
          });
          setShowMatch(true);
          setRequestToRemoveAfterMatch(targetRequest._id);
        } else {
          setRequests((prev) => prev.filter((req) => req._id !== targetRequest._id));
          setCurrentRequestIndex((prev) => (prev >= requests.length - 1 ? 0 : prev));
        }
      }
    } catch (error) {
      console.error('Failed to like back:', error);
    }
  };

  const handleIgnore = async (notificationId: string) => {
    try {
      await fetch(`http://localhost:5050/matches/ignore/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setRequests((prev) => prev.filter((req) => req._id !== notificationId));
    } catch (error) {
      console.error('Failed to ignore request:', error);
    }
  };

  const closeMatchModal = () => {
    setShowMatch(false);
    setMatchedProfile(null);
    if (requestToRemoveAfterMatch) {
      setRequests((prev) => prev.filter((req) => req._id !== requestToRemoveAfterMatch));
      setCurrentRequestIndex((prev) => (prev >= requests.length - 1 ? 0 : prev));
      setRequestToRemoveAfterMatch(null);
    }
  };

  if (!email) return <div className="text-center py-10">Loading user...</div>;
  if (requests.length === 0) return <div className="text-center py-10">No requests at the moment.</div>;

  const currentRequest = requests[currentRequestIndex];

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden shadow-2xl border-0 bg-white rounded-3xl transform transition-all duration-300 hover:scale-105">
          <div className="relative">
            <img
              src={currentRequest.sender_image || '/default-profile.jpg'}
              alt={currentRequest.sender_name || 'User'}
              className="w-full h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h2 className="text-3xl font-bold mb-2">
                {currentRequest.sender_name || 'Unknown'}, {currentRequest.sender_age || 'N/A'}
              </h2>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{currentRequest.sender_location || 'Unknown'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm">{currentRequest.sender_profession || 'No Profession'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-4 h-4" />
                  <span className="text-sm">{currentRequest.sender_education || 'No Education'}</span>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <p className="text-gray-700 mb-4 leading-relaxed">
              {currentRequest.message || 'This user liked your profile!'}
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => handleIgnore(currentRequest._id)} variant="outline" size="lg" className="w-16 h-16 rounded-full border-2 border-gray-300 hover:border-red-400 hover:bg-red-50">
                <X className="w-8 h-8 text-gray-500 hover:text-red-500" />
              </Button>
              <Button onClick={() => handleLikeBack(currentRequest.from)} size="lg" className="w-16 h-16 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg hover:scale-110">
                <Heart className="w-8 h-8 text-white" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showMatch && matchedProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center relative">
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
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-rose-200">
                <img src={matchedProfile.userImage} alt="You" className="w-full h-full object-cover" />
              </div>
              <Heart className="w-8 h-8 text-rose-500 animate-pulse" />
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-rose-200">
                <img src={matchedProfile.images[0]} alt={matchedProfile.name} className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="space-y-3">
              <Button onClick={() => window.location.href = '/dashboard'} className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold py-3 rounded-xl">
                <MessageCircle className="w-5 h-5 mr-2" />
                Start Chat
              </Button>
              <Button variant="outline" onClick={closeMatchModal} className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl">
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
