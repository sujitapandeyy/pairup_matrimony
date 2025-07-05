'use client';

import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { MessageCircle, Send, Heart } from 'lucide-react';

interface Match {
  name: string;
  email: string;
  images: string[];
  online?: boolean;
  location?: string;
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

    const socket = io('http://localhost:5050', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
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
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    socketRef.current.emit('send_message', messageData);
    setMessages((prev) => [...prev, messageData]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Match Sidebar */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Your Matches <Heart className="w-5 h-5 text-red-500" />
          </h2>
          <p className="text-sm text-gray-500 mt-1">{matches.length} matches found</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No matches yet. Keep swiping!</p>
            </div>
          ) : (
            <div className="py-2">
              {matches.map((match, idx) => (
                <div
                  key={match.email ?? idx}
                  onClick={() => onSelectChat(match)}
                  className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedChat?.email === match.email
                      ? ''
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <img
                        src={match.images?.[0]}
                        alt={match.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                      />
                      {match.online && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate text-base">
                          {match.name}
                        </h3>
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                          20% match
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-1">{match.location}</p>
                      <p className="text-sm text-gray-600 truncate">Start chatting</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-white">
        {!selectedChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Select a match to start chatting
              </h3>
              <p className="text-gray-500">Choose someone from your matches to begin a conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={selectedChat.images?.[0] || '/defaultgirl.jpg'}
                      alt={selectedChat.name}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    />
                    {selectedChat.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{selectedChat.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedChat.online ? 'Online' : 'Offline'} • {selectedChat.location}
                    </p>
                  </div>
                </div>
                <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">
                  20% Match
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === loggedInEmail ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex items-start gap-3 max-w-xs">
                    {msg.sender !== loggedInEmail && (
                      <img
                        src={selectedChat.images?.[0] || '/defaultgirl.jpg'}
                        alt={selectedChat.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl break-words ${
                        msg.sender === loggedInEmail
                          ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-br-md'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <div
                        className={`text-xs mt-2 ${
                          msg.sender === loggedInEmail ? 'text-pink-100' : 'text-gray-400'
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  className="w-full px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-full flex items-center justify-center hover:from-pink-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
