'use client';

import React, { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
// import NavBar from '@/components/NavBar';

interface Match {
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
    <>
      {/* <NavBar unreadMessageCount={unreadCount} /> */}
      <ChatInterface
        onSelectChat={setSelectedChat}
        selectedChat={selectedChat}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
}
