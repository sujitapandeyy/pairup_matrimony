'use client';

import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { MessageCircle, Send, Heart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface Match {
  name: string;
  email: string;
  images: string[];
  online?: boolean;
}

interface Message {
  sender: string;
  receiver: string;
  message: string;
  timestamp?: string;
}

interface ChatInterfaceProps {
  onSelectChat: (chat: Match | null) => void;
  selectedChat: Match | null;
}

const ChatInterface = ({ onSelectChat, selectedChat }: ChatInterfaceProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('pairupUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.email) setLoggedInEmail(user.email);
      } catch {
        console.warn('Invalid user object in localStorage');
      }
    }
  }, []);

  useEffect(() => {
    if (!loggedInEmail) return;

    const socket = io('http://localhost:5050', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SocketIO] Connected:', socket.id);
      socket.emit('join', { email: loggedInEmail });
    });

    socket.on('receive_message', (msg: Message) => {
      if (
        (msg.sender === selectedChat?.email && msg.receiver === loggedInEmail) ||
        (msg.sender === loggedInEmail && msg.receiver === selectedChat?.email)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[SocketIO] Connection error:', err);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [loggedInEmail, selectedChat]);

  useEffect(() => {
    if (!loggedInEmail) return;

    const fetchMatches = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `http://localhost:5050/matches/get_mutual_matches?email=${encodeURIComponent(loggedInEmail)}`
        );
        const data = await res.json();
        setMatches(data.matches || []);
      } catch (err) {
        console.error('Failed to load matches:', err);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [loggedInEmail]);

  useEffect(() => {
    setMessages([]);
  }, [selectedChat]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat || !socketRef.current) return;

    const messageData: Message = {
      sender: loggedInEmail,
      receiver: selectedChat.email,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    socketRef.current.emit('send_message', messageData);
    setMessages((prev) => [...prev, messageData]);
    setNewMessage('');
  };

  if (selectedChat) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="h-160 flex flex-col rounded-2xl shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-rose-500 to-pink-500 text-white p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => onSelectChat(null)} className="text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img src={selectedChat.images?.[0] || ''} className="w-10 h-10 rounded-full object-cover border-2" />
              <h3 className="text-lg font-semibold">{selectedChat.name}</h3>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-4 w-auto h-full overflow-y-auto bg-gray-50 space-y-2 flex flex-col">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.sender === loggedInEmail
                    ? 'bg-rose-500 text-white self-end ml-auto'
                    : 'bg-gray-200 text-gray-800 self-start'
                }`}
              >
                {msg.message}
              </div>
            ))}
          </CardContent>

          <div className="p-4 border-blue-200 flex items-center gap-2 bg-white">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 rounded-full px-4"
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Your Matches</h2>
      <p className="mb-6 text-gray-500">Start chatting with someone special</p>

      {loading ? (
        <p>Loading...</p>
      ) : matches.length === 0 ? (
        <div className="text-center py-10">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No matches yet. Keep swiping!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match, idx) => (
            <Card
              key={match.email ?? idx}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 bg-white rounded-xl overflow-hidden transform hover:scale-105"
              onClick={() => onSelectChat(match)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <img
                      src={match.images?.[0] ?? ''}
                      alt={match.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-rose-200"
                    />
                    {match.online && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">{match.name}</h3>
                    </div>
                    <h4 className="text-gray-500">Start chatting</h4>
                  </div>
                  <MessageCircle className="w-5 h-5 text-rose-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
