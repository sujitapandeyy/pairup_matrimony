"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { MessageCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

function getTimeAgo(timestamp: string | Date) {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getFullImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return "/default-profile.jpg";
  if (imagePath.startsWith("/uploads/")) {
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${imagePath}`;
  }
  return imagePath;
}

const Matches = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("pairupUser");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.email) setEmail(user.email.toLowerCase());
    }
  }, []);

  useEffect(() => {
    if (!email) return;

    const fetchMatches = async () => {
      try {
        const res = await api.get("/matches/notifications", { params: { email } });
        setMatches(res.data);
      } catch {
        toast.error("Failed to load matches");
      }
    };

    fetchMatches();
  }, [email]);

  if (!email) return <div className="text-center py-10">Loading user...</div>;
  if (matches.length === 0)
    return (
      <div className="text-center py-20 text-gray-500">
        No matches yet. Like profiles to start matching!
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-3">
      {matches.map((match) => (
        <div
          key={match._id}
          className="flex items-center justify-between p-4 rounded-lg border border-green-400 bg-white"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={getFullImageUrl(match.sender_image)}
                alt={match.sender_name}
                className="w-14 h-14 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white">
                <Check className="w-3 h-3 text-white" />
              </span>
            </div>
            <div>
              <p className="text-gray-900 font-semibold">
                {match.sender_name}{" "}
             <span className="font-normal">
  {match.status === "sent_pending" && "Request sent"}
  {match.status === "sent_accepted" && "Request accepted"}
  {match.status === "received_pending" && "Incoming request"}
  {match.status === "received_match" && "You are matched now 🎉"}
</span>

              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400">{getTimeAgo(match.created_at)}</p>
            <Button
              onClick={() => router.push("/chat")}
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white border-0 rounded-lg h-8 text-xs font-semibold flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Send Message
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Matches;
