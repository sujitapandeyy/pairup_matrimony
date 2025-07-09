'use client';

import React, { useEffect, useState } from 'react';
import ProfilePage from '@/components/ProfilePage';

export default function Profile() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('pairupUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.email) {
          setUserId(parsed.email);
        }
      } catch (err) {
        console.error('Invalid user data in localStorage');
      }
    }
  }, []);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-lg">
        Loading user profile...
      </div>
    );
  }

  return <ProfilePage userId={userId} />;
}
