'use client';

import UserView from '@/components/UserView';
import { useParams } from 'next/navigation';

export default function UserPage() {
  const { id } = useParams();

  if (!id || typeof id !== 'string') {
    return <div>Invalid user ID</div>;
  }

  return <UserView userId={id} />;
}
