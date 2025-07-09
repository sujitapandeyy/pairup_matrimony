'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  MessageCircle,
  Heart,
  User,
  X,
  Bell,
  Send,
  LayoutDashboard,
  List,
  Eraser,
  Info,
} from 'lucide-react';

const NavBar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setUserRole] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [sentRequestCount, setSentRequestCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedUser = localStorage.getItem('pairupUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.email) setUserEmail(user.email);
        if (user.role) setUserRole(user.role);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!userEmail || role === 'admin') return;

    const fetchCounts = () => {
      fetch(`http://localhost:5050/matches/notifications?email=${encodeURIComponent(userEmail)}`)
        .then(res => res.json())
        .then(data => {
          const count = Array.isArray(data)
            ? data.filter((n: any) => n.type === 'request').length
            : 0;
          setRequestCount(count);
        })
        .catch(() => setRequestCount(0));

      fetch(`http://localhost:5050/matches/sent_requests?email=${encodeURIComponent(userEmail)}`)
        .then(res => res.json())
        .then(data => {
          const count = data?.sentRequests?.length || 0;
          setSentRequestCount(count);
        })
        .catch(() => setSentRequestCount(0));
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, [userEmail, role]);

  const currentView = (() => {
    if (pathname === '/' || pathname === '/user_dashboard') return 'dashboard';
    if (pathname.startsWith('/admin/dashboard')) return 'admin-dashboard';
    if (pathname.startsWith('/admin/user')) return 'admin-user';
    if (pathname.startsWith('/admin/reports')) return 'admin-reports';
    if (pathname.startsWith('/chat')) return 'chat';
    if (pathname.startsWith('/requests')) return 'requests';
    if (pathname.startsWith('/sent')) return 'sent';
    if (pathname.startsWith('/profile')) return 'profile';
    return '';
  })();

  const navigate = (page: string) => router.push(page);

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-pink-100">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo click navigates to correct dashboard */}
        <button
          type="button"
          onClick={() => navigate(role === 'admin' ? '/admin/dashboard' : '/user_dashboard')}
          className="flex items-center space-x-3 cursor-pointer"
          aria-label="Go to Dashboard"
        >
          <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            Pair-Up
          </h1>
        </button>

        <nav className="flex items-center space-x-6">
          {role === 'admin' ? (
            <>
              <IconButton
                icon={<LayoutDashboard className="w-6 h-6" />}
                label="Admin Dashboard"
                active={currentView === 'admin-dashboard'}
                onClick={() => navigate('/admin/dashboard')}
              />
              <IconButton
                icon={<User className="w-6 h-6" />}
                label="Users"
                active={currentView === 'admin-user'}
                onClick={() => navigate('/admin/users')}
              />
              <IconButton
                icon={<Info className="w-6 h-6" />}
                label="reports"
                active={currentView === 'admin-reports'}
                onClick={() => navigate('/admin/reports')}
              />
              <IconButton
                icon={<X className="w-6 h-6" />}
                label="Logout"
                onClick={() => {
                  localStorage.removeItem('pairupUser');
                  router.push('/login');
                }}
              />
            </>
          ) : (
            <>
              <IconButton
                icon={<Heart className="w-6 h-6" />}
                label="Dashboard"
                active={currentView === 'dashboard'}
                onClick={() => navigate('/user_dashboard')}
              />
              <IconButton
                icon={<MessageCircle className="w-6 h-6" />}
                label="Chat"
                active={currentView === 'chat'}
                onClick={() => navigate('/chat')}
                badge={isMounted ? unreadChatCount : undefined}
              />
              <IconButton
                icon={<Bell className="w-6 h-6" />}
                label="Requests"
                active={currentView === 'requests'}
                onClick={() => navigate('/requests')}
                badge={isMounted ? requestCount : undefined}
              />
              <IconButton
                icon={<Send className="w-6 h-6" />}
                label="Sent Requests"
                active={currentView === 'sent'}
                onClick={() => navigate('/sent')}
                badge={isMounted ? sentRequestCount : undefined}
              />
              <IconButton
                icon={<User className="w-6 h-6" />}
                label="Profile"
                active={currentView === 'profile'}
                onClick={() => navigate('/profile')}
              />
              <IconButton
                icon={<X className="w-6 h-6" />}
                label="Logout"
                onClick={() => {
                  localStorage.removeItem('pairupUser');
                  router.push('/login');
                }}
              />
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

const IconButton = ({
  icon,
  label,
  onClick,
  active,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number | string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative p-2 rounded-full transition-colors ${
      active ? 'bg-rose-100 text-rose-600' : 'text-gray-600 hover:text-rose-600'
    }`}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
  >
    {icon}
    {Number(badge) > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5">
        {badge}
      </span>
    )}
  </button>
);

export default NavBar;
