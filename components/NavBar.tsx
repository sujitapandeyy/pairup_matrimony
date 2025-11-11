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

function getFullImageUrl(photoPath?: string | null) {
  if (!photoPath) return null;
  if (photoPath.startsWith("/uploads/")) {
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${photoPath}?t=${Date.now()}`;
  }
  return photoPath;
}

const NavBar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setUserRole] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [sentRequestCount, setSentRequestCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedUser = localStorage.getItem("pairupUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.email) setUserEmail(user.email);
        if (user.role) setUserRole(user.role);
        if (user.id || user._id) {
          const id = user.id || user._id;
          setUserId(id);
          // Fetch user profile data
          fetchUserProfile(id);
        }
      } catch {}
    }
  }, []);

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

  const currentView = (() => {
    if (pathname === "/" || pathname === "/user_dashboard") return "dashboard";
    if (pathname.startsWith("/admin/dashboard")) return "admin-dashboard";
    if (pathname.startsWith("/admin/user")) return "admin-user";
    if (pathname.startsWith("/admin/reports")) return "admin-reports";
    if (pathname.startsWith("/chat")) return "chat";
    if (pathname.startsWith("/requests")) return "requests";
    if (pathname.startsWith("/sent")) return "sent";
    // if (pathname.startsWith("/matches")) return "matches";
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
              badge={isMounted ? requestCount : undefined}
            />
            <NavButton
              icon={<Send className=" w-6 h-6" />}
              label="Sent"
              active={currentView === "sent"}
              onClick={() => navigate("/sent")}
              badge={isMounted ? sentRequestCount : undefined}
            />
            <NavButton
              icon={<MessageCircle className="w-6 h-6" />}
              label="Chat"
              active={currentView === "chat"}
              onClick={() => navigate("/chat")}
              badge={isMounted ? unreadChatCount : undefined}
            />
            {/* <NavButton
              icon={<Heart className="w-6 h-6" />}
              label="Matches"
              active={currentView === "matches"}
              onClick={() => navigate("/matches")}
            /> */}

            {/* User Profile Section */}
            {role !== "admin" && isMounted && userName && (
              <div className="">
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

      {/* Logout at bottom */}
      <div className="p-3 border-t border-gray-200">
        <NavButton
          icon={<LogOut className="w-6 h-6" />}
          label="Logout"
          onClick={() => {
            localStorage.removeItem("pairupUser");
            router.push("/login");
            toast.success("Logged out successfully");
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
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center space-x-4 px-3 py-3 rounded-xl transition-all duration-200 group text-gray-700 hover:bg-gray-100${
      active ? " text-black font-extrabold text-3xl" : ""
    }`}
    aria-label={label}
    aria-current={active ? "page" : undefined}
  >
    <div className="relative flex-shrink-0">
      <div
        className={`transition-transform duration-200 ${
          active ? "scale-105" : "group-hover:scale-105"
        }`}
      >
        {icon}
      </div>
      {Number(badge) > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </div>
    <span className={`text-base ${active ? "font-semibold" : "font-normal"}`}>
      {label}
    </span>
  </button>
);

export default NavBar;
