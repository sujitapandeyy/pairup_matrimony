"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageCircle,
  Heart,
  User,
  X,
  Bell,
  Send,
  LayoutDashboard,
  Info,
  LogOut,
  Home,
  UserPlus2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSession, signOut } from "next-auth/react";
import { getFullImageUrl } from "@/lib/utils/image";

const NavBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setUserRole] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [sentRequestCount, setSentRequestCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Mark component as mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch user info from NextAuth session
  useEffect(() => {
    if (status === "authenticated" && session?.user && isMounted) {
      setUserName(session.user.name || null);
      setUserPhoto(getFullImageUrl(session.user.photo));
      setUserRole(session.user.role || null);
      setUserId(session.user.id || null);

      // Optional: Re-fetch full profile from backend if needed
      if (session.user.id) {
        fetchUserProfile(session.user.id);
      }
    }
  }, [session, status, isMounted]);

  // Fetch sent requests count and received requests count
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email && isMounted) {
      fetchSentRequestsCount();
      fetchReceivedRequestsCount();
      
      // Refresh count every 30 seconds
      const interval = setInterval(() => {
        fetchSentRequestsCount();
        fetchReceivedRequestsCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [session?.user?.email, status, isMounted]);

  const fetchSentRequestsCount = async () => {
    try {
      const res = await api.get(`/matches/sent_requests`, {
        params: { email: session?.user?.email },
      });

      if (res.status === 200 && Array.isArray(res.data.sentRequests)) {
        const activeRequests = res.data.sentRequests.filter(
          (r: any) => r.status !== "accepted"
        );
        setSentRequestCount(activeRequests.length);
      } else {
        setSentRequestCount(0);
      }
    } catch (err) {
      console.error("Failed to fetch sent requests count:", err);
      setSentRequestCount(0);
    }
  };

  const fetchReceivedRequestsCount = async () => {
    try {
      const res = await api.get(`/matches/notifications`, {
        params: { email: session?.user?.email },
      });

      if (res.status === 200 && Array.isArray(res.data)) {
        // Only count "request" type notifications that need to be accepted or rejected
        let filtered = res.data.filter(
          (n: any) =>
            n.type === "request" &&
            n.to?.toLowerCase() === session?.user?.email?.toLowerCase()
        );

        const notificationMap = new Map();
        filtered.forEach((n: any) => {
          const key = n.from?.toLowerCase();
          if (!notificationMap.has(key)) {
            notificationMap.set(key, n);
          }
        });

        filtered = Array.from(notificationMap.values());
        setRequestCount(filtered.length);
      } else {
        setRequestCount(0);
      }
    } catch (err) {
      console.error("Failed to fetch received requests count:", err);
      setRequestCount(0);
    }
  };

  const fetchUserProfile = async (id: string) => {
    try {
      const res = await api.get(`/api/user/profile/${id}`);
      const profile = res.data;
      if (profile.name) setUserName(profile.name);
      if (profile.photo) setUserPhoto(getFullImageUrl(profile.photo));
    } catch (err: any) {
      console.error("Failed to fetch user profile:", err);
    }
  };

  // Identify current view
  const currentView = (() => {
    if (pathname === "/" || pathname === "/user_dashboard") return "dashboard";
    if (pathname.startsWith("/admin/dashboard")) return "admin-dashboard";
    if (pathname.startsWith("/admin/user")) return "admin-user";
    if (pathname.startsWith("/admin/reports")) return "admin-reports";
    if (pathname.startsWith("/chat")) return "chat";
    if (pathname.startsWith("/requests")) return "requests";
    if (pathname.startsWith("/sent")) return "sent";
    if (pathname.startsWith("/profile")) return "profile";
    return "";
  })();

  const navigate = (page: string) => router.push(page);



  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-gradient-to-br from-rose-50 via-purple-50 to-orange-50 border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 pb-8">
        <button
          type="button"
          onClick={() =>
            navigate(role === "admin" ? "/admin/dashboard" : "/user_dashboard")
          }
          className="flex items-center space-x-3 cursor-pointer group"
          aria-label="Go to Dashboard"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <Heart className="w-6 h-6 text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            Pair-Up
          </h1>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-5 space-y-2 ml-1">
        {role === "admin" ? (
          <>
            <NavButton
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Dashboard"
              active={currentView === "admin-dashboard"}
              onClick={() => navigate("/admin/dashboard")}
            />
            <NavButton
              icon={<User className="w-6 h-6" />}
              label="Users"
              active={currentView === "admin-user"}
              onClick={() => navigate("/admin/users")}
            />
            <NavButton
              icon={<Info className="w-6 h-6" />}
              label="Reports"
              active={currentView === "admin-reports"}
              onClick={() => navigate("/admin/reports")}
            />
          </>
        ) : (
          <>
            <NavButton
              icon={<Home className="w-6 h-6" />}
              label="Dashboard"
              active={currentView === "dashboard"}
              onClick={() => navigate("/user_dashboard")}
            />
            <NavButton
              icon={<UserPlus2 className="w-6 h-6" />}
              label="Requests"
              active={currentView === "requests"}
              onClick={() => navigate("/requests")}
              badge={requestCount > 0 ? requestCount : undefined}
            />
            <NavButton
              icon={<Send className="w-6 h-6" />}
              label="Sent"
              active={currentView === "sent"}
              onClick={() => navigate("/sent")}
              badge={sentRequestCount > 0 ? sentRequestCount : undefined}
            />
            <NavButton
              icon={<MessageCircle className="w-6 h-6" />}
              label="Chat"
              active={currentView === "chat"}
              onClick={() => navigate("/chat")}
              badge={unreadChatCount > 0 ? unreadChatCount : undefined}
            />

            {/* User Profile Section */}
            {role !== "admin" && userName && (
              <div>
                <NavButton
                  icon={
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-rose-500 to-pink-500 flex-shrink-0">
                      {userPhoto ? (
                        <img
                          src={userPhoto}
                          alt={userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  }
                  label={userName}
                  active={currentView === "profile"}
                  onClick={() => navigate("/profile")}
                />
              </div>
            )}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <NavButton
          icon={<LogOut className="w-6 h-6" />}
          label="Logout"
          onClick={async () => {
            try {
              await signOut({
                redirect: false,
                callbackUrl: "/login",
              });
              toast.success("Logged out successfully");
              router.push("/login");
            } catch (error) {
              console.error("Logout error:", error);
              toast.error("Failed to logout");
            }
          }}
        />
      </div>
    </aside>
  );
};

const NavButton = ({
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
}) => {
  const baseClass = "w-full flex items-center space-x-4 px-3 py-3 rounded-xl transition-all duration-200 group text-gray-700 hover:bg-gray-100";
  const activeClass = active ? "text-black font-extrabold" : "";
  const buttonClass = `${baseClass} ${activeClass}`;

  const iconScaleClass = active ? "scale-105" : "group-hover:scale-105";

  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonClass}
    >
      <div className="relative flex-shrink-0">
        <div className={`transition-transform duration-200 ${iconScaleClass}`}>
          {icon}
        </div>
        {Number(badge) > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 animate-pulse shadow-lg">
            {Number(badge) > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span className={`text-base ${active ? "font-semibold" : "font-normal"}`}>
        {label}
      </span>
    </button>
  );
};

export default NavBar;