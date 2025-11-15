'use client';

import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import ChatInterface from '@/components/ChatInterface';

interface Match {
  _id?: string;
  name: string;
  email: string;
  images: string[];
  online?: boolean;
  location?: string;
  lastMessage?: string;
  lastTimestamp?: string;
  lastSender?: string;
  lastRead?: string;
}

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState<Match | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <SessionProvider>
      <div className="h-screen">
        <ChatInterface
          onSelectChat={setSelectedChat}
          selectedChat={selectedChat}
          onUnreadCountChange={setUnreadCount}
        />
      </div>
    </SessionProvider>
  );
}