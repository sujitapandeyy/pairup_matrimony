'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ProfilePage from '@/components/ProfilePage';

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-lg">
        Checking authentication...
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user?.email) {
    router.replace('/login');
    return null;
  }

  return <ProfilePage userId={session.user.email} />;
}
