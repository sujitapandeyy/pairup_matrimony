'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Send, Heart } from 'lucide-react';
import io from 'socket.io-client';

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

interface Message {
  sender: string;
  receiver: string;
  message: string;
  timestamp?: string;
}

interface ChatInterfaceProps {
  onSelectChat: (chat: Match | null) => void;
  selectedChat: Match | null;
  onUnreadCountChange: (count: number) => void;
}

const SOCKET_SERVER_URL = 'http://localhost:5050';

const normalizeTimestamp = (ts?: string) => {
  if (!ts) return '';
  return ts.endsWith('Z') ? ts : ts + 'Z';
};

const ChatInterface = ({ onSelectChat, selectedChat, onUnreadCountChange }: ChatInterfaceProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]); // Store all online users emails

  const socketRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const selectedChatRef = useRef<Match | null>(null);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const isoTs = normalizeTimestamp(timestamp);
    const date = new Date(isoTs);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kathmandu',
    }).format(date);
  };

  const fetchReadReceipt = async (user: string, chatWith: string) => {
    try {
      const res = await fetch(`${SOCKET_SERVER_URL}/chat/read_receipt?user=${user}&chat_with=${chatWith}`);
      const data = await res.json();
      return data?.last_read || null;
    } catch {
      return null;
    }
  };

  const fetchChatHistory = async (user1: string, user2: string): Promise<Message[]> => {
    try {
      const res = await fetch(
        `${SOCKET_SERVER_URL}/chat/history?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`
      );
      const data = await res.json();
      return (data.messages || []).map((msg: Message) => ({
        ...msg,
        timestamp: normalizeTimestamp(msg.timestamp),
      }));
    } catch (err) {
      console.error('Failed to load chat history:', err);
      return [];
    }
  };

  const fetchMatches = useCallback(async () => {
    if (!loggedInEmail) return;
    try {
      const res = await fetch(`${SOCKET_SERVER_URL}/matches/get_mutual_matches?email=${encodeURIComponent(loggedInEmail)}`);
      const data = await res.json();
      const rawMatches = data.matches || [];

      const matchesWithMeta: Match[] = await Promise.all(
        rawMatches.map(async (match: Match) => {
          const history = await fetchChatHistory(loggedInEmail, match.email);
          const last = history[history.length - 1];
          const lastRead = await fetchReadReceipt(loggedInEmail, match.email);
          return {
            ...match,
            lastMessage: last?.message,
            lastTimestamp: last?.timestamp,
            lastSender: last?.sender,
            lastRead: lastRead ? normalizeTimestamp(lastRead) : undefined,
            online: false,
          };
        })
      );

      matchesWithMeta.sort((a, b) => {
        const aTime = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
        const bTime = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
        return bTime - aTime;
      });

      setMatches(matchesWithMeta);

      // Calculate total unread messages count across all matches:
      const unreadCount = matchesWithMeta.reduce((acc, m) => {
        const unread =
          m.lastMessage &&
          m.lastSender !== loggedInEmail &&
          (!m.lastRead || new Date(m.lastTimestamp || '').getTime() > new Date(m.lastRead).getTime());
        return acc + (unread ? 1 : 0);
      }, 0);

      onUnreadCountChange(unreadCount);
    } catch (err) {
      console.error('Failed to load matches:', err);
    }
  }, [loggedInEmail, onUnreadCountChange]);

  useEffect(() => {
    const storedUser = localStorage.getItem('pairupUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.email) setLoggedInEmail(user.email);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!loggedInEmail) return;

    const socket = io(SOCKET_SERVER_URL, { query: { email: loggedInEmail } });
    socketRef.current = socket;

    socket.on('online_users', (onlineEmails: string[]) => {
      setOnlineUsers(onlineEmails); // Save full online users list

      setMatches((prev) =>
        prev.map((match) => ({
          ...match,
          online: onlineEmails.includes(match.email), // Update match online status
        }))
      );
    });

    socket.on('receive_message', (msg: Message) => {
      const fixedTimestamp = normalizeTimestamp(msg.timestamp);
      const newMsg = { ...msg, timestamp: fixedTimestamp };

      const currentChat = selectedChatRef.current;
      const isForCurrentChat =
        currentChat && (msg.sender === currentChat.email || msg.receiver === currentChat.email);

      if (isForCurrentChat) {
        setMessages((prev) => [...prev, newMsg]);
      }

      setMatches((prev) => {
        const updated = prev.map((m) =>
          m.email === msg.sender || m.email === msg.receiver
            ? {
                ...m,
                lastMessage: msg.message,
                lastTimestamp: fixedTimestamp,
                lastSender: msg.sender,
              }
            : m
        );
        return [...updated].sort(
          (a, b) =>
            new Date(b.lastTimestamp || '').getTime() - new Date(a.lastTimestamp || '').getTime()
        );
      });
    });

    return () => {
      socket.off('online_users');
      socket.off('receive_message');
      socket.disconnect();
    };
  }, [loggedInEmail]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    if (!socketRef.current || !loggedInEmail) return;
    if (selectedChat?.email) {
      socketRef.current.emit('join_room', {
        user1: loggedInEmail,
        user2: selectedChat.email,
      });
      fetchChatHistory(loggedInEmail, selectedChat.email).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [selectedChat, loggedInEmail]);

  useEffect(() => {
    if (selectedChat?.email && loggedInEmail && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.timestamp) {
        fetch(`${SOCKET_SERVER_URL}/chat/read_receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: loggedInEmail,
            chat_with: selectedChat.email,
            timestamp: lastMsg.timestamp,
          }),
        }).then(() => {
          fetchMatches(); // Refresh sidebar read state & unread counts
        });
      }
    }
  }, [selectedChat, messages, loggedInEmail, fetchMatches]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedChat?.email || !socketRef.current) return;
    const messageData: Message = {
      sender: loggedInEmail,
      receiver: selectedChat.email,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    socketRef.current.emit('send_message', messageData);
    setNewMessage('');
  }, [newMessage, loggedInEmail, selectedChat]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Your Matches <Heart className="w-5 h-5 text-red-500" />
          </h2>
          <p className="text-sm text-gray-500 mt-1">{matches.length} matches found</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {matches.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No matches yet. Keep swiping!</p>
            </div>
          ) : (
            <div className="py-2">
              {matches.map((match) => {
                const unread =
                  match.lastMessage &&
                  match.lastSender !== loggedInEmail &&
                  (!match.lastRead ||
                    new Date(match.lastTimestamp || '').getTime() >
                      new Date(match.lastRead).getTime());

                return (
                  <div
                    key={match.email}
                    onClick={() => onSelectChat(match)}
                    className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedChat?.email === match.email ? 'bg-pink-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <img
                          src={match.images?.[0] || '/default-profile.jpg'}
                          alt={match.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                        />
                      
                         {onlineUsers.includes(match.email) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
                      {/* <p className="text-sm text-gray-500">
                {onlineUsers.includes(match.email) ? 'Online' : 'Offline'} • {match.location || ''}
              </p> */}
                      {/* {match.online && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      )} */}
                    </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{match.name}</h3>
                        <p className={`text-sm truncate ${unread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                          {match.lastMessage || 'Start chatting...'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {!selectedChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a match to start chatting</h3>
              <p className="text-gray-500">Choose someone from your matches to begin a conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
              {/* Partner */}
              <div className="relative">
                <img
                  src={selectedChat.images?.[0] || '/default-profile.jpg'}
                  alt={selectedChat.name}
                  className="w-12 h-12 rounded-full object-cover border border-gray-200"
                />
                {onlineUsers.includes(selectedChat.email) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{selectedChat.name}</h3>
                <p className="text-sm text-gray-500">
                  {onlineUsers.includes(selectedChat.email) ? 'Online' : 'Offline'} • {selectedChat.location || ''}
                </p>
              </div>

              {/* Logged-in User Online Indicator */}
              {/* <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-gray-600">You</span>
                <div
                  className={`w-3 h-3 rounded-full border-2 border-gray-300 ${
                    onlineUsers.includes(loggedInEmail) ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              </div> */}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 italic pt-20">No messages yet. Say hello! 👋</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={`${msg.timestamp}_${msg.message}`}
                    className={`flex ${msg.sender === loggedInEmail ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-start gap-3 max-w-xs">
                      {msg.sender !== loggedInEmail && (
                        <img
                          src={selectedChat.images?.[0] || '/default-profile.jpg'}
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
                        {msg.timestamp && (
                          <div
                            className={`text-xs mt-2 ${
                              msg.sender === loggedInEmail ? 'text-pink-100' : 'text-gray-400'
                            }`}
                          >
                            {formatTime(msg.timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef}></div>
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
                  className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-full flex items-center justify-center hover:from-pink-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
