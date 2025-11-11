'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  X,
  MessageCircle,
  MapPin,
  Briefcase,
  Check,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { getFullImageUrl } from "@/lib/utils/image";
import { getCompatibilityColor } from "@/lib/utils/match";
import { getTimeAgoKathmandu } from "@/lib/utils/date";


const Requests = () => {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserImage, setCurrentUserImage] = useState<string | null>(null);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    const storedUser = localStorage.getItem("pairupUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.email) {
          const userEmail = parsed.email.toLowerCase();
          setEmail(userEmail);
          if (parsed?._id) {
            setUserId(parsed._id);
            fetchCurrentUserProfile(parsed._id);
          }
        }
      } catch {
        toast.error("Error parsing user info");
      }
    } else {
      toast.error("Please log in");
      router.push("/login");
    }
  }, [router]);

  const fetchCurrentUserProfile = async (userIdParam: string) => {
    try {
      const res = await api.get(`/api/user/profile/${userIdParam}`);
      if (res.data?.photo) {
        setCurrentUserImage(res.data.photo);
      }
    } catch (error) {
      console.error("Error fetching current user profile:", error);
    }
  };

  const fetchRequests = async () => {
    if (!email) return;
    
    try {
      const res = await api.get(`/matches/notifications`, { params: { email } });
      
      // Filter notifications
      let filtered = res.data.filter(
        (n: any) =>
          ["request", "match", "request_accepted"].includes(n.type) &&
          n.to?.toLowerCase() === email
      );

      // Remove duplicate notifications - keep only the latest type for each sender
      const notificationMap = new Map();
      filtered.forEach((n: any) => {
        const key = n.from?.toLowerCase();
        if (!notificationMap.has(key)) {
          notificationMap.set(key, n);
        } else {
          const existing = notificationMap.get(key);
          // Priority: match > request_accepted > request
          if (n.type === 'match' || 
              (n.type === 'request_accepted' && existing.type === 'request')) {
            notificationMap.set(key, n);
          }
        }
      });

      // Convert back to array and sort by date (newest first)
      filtered = Array.from(notificationMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRequests(filtered);
    } catch {
      toast.error("Failed to load requests");
    }
  };

  useEffect(() => {
    if (!email) return;
    fetchRequests();
  }, [email]);

  const handleAccept = async (request: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (processingRequests.has(request._id)) return;
    setProcessingRequests((prev) => new Set(prev).add(request._id));

    try {
      const res = await api.post("/matches/swipe", {
        swiper_email: email,
        target_email: request.from,
        liked: true,
      });

      const isMatch = res.data.match;

      if (isMatch) {
        toast.success(`It's a Match with ${request.sender_name}!`);
      } else {
        toast.success(`You are now matched with ${request.sender_name}!`);
      }

      // Auto-refresh requests after 500ms to show updated state
      setTimeout(() => {
        fetchRequests();
      }, 500);
      
    } catch {
      toast.error("Failed to accept request");
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(request._id);
        return newSet;
      });
    }
  };

  const handleReject = async (request: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (processingRequests.has(request._id)) return;
    setProcessingRequests((prev) => new Set(prev).add(request._id));

    try {
      await api.delete(`/matches/ignore/${request._id}`);
      setRequests((prev) => prev.filter((r) => r._id !== request._id));
      toast.success("Request rejected");
    } catch {
      toast.error("Failed to reject request");
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(request._id);
        return newSet;
      });
    }
  };

  const handleViewProfile = (request: any) => {
    if (processingRequests.has(request._id)) return;
    if (request.sender_id) {
      sessionStorage.setItem("lastViewedProfile", request.from);
      sessionStorage.setItem("returningFromProfile", "true");
      router.push(`/user/${request.sender_id}`);
    } else {
      toast.error("User ID not found");
    }
  };

  if (!email) return <div className="text-center py-10">Loading user...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Match Requests and Notifications</h1>
      {requests.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No requests yet</div>
      ) : (
        <div className="space-y-2">
          {requests.map((request) => {
            const isProcessing = processingRequests.has(request._id);
            const isAccepted = request.type === "request_accepted";
            const isMatch = request.type === "match";

            return (
              <div
                key={request._id}
                onClick={() => {
                  if (!isAccepted && !isMatch) handleViewProfile(request);
                }}
                className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${
                  !isAccepted && !isMatch ? "cursor-pointer" : ""
                } border border-gray-100 ${
                  isMatch
                    ? "border-green-300 bg-green-50"
                    : isAccepted
                    ? "border-green-200 bg-green-50"
                    : "hover:border-pink-200"
                } ${isProcessing ? "opacity-60 pointer-events-none" : ""}`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Profile Image */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-14 h-14 rounded-full overflow-hidden ring-2 ${
                          isAccepted || isMatch ? "ring-green-300" : "ring-pink-100"
                        }`}
                      >
                        <img
                          src={getFullImageUrl(request.sender_image)}
                          alt={request.sender_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 w-6 h-6 ${
                          isAccepted || isMatch
                            ? "bg-gradient-to-r from-green-500 to-emerald-500"
                            : "bg-gradient-to-r from-pink-500 to-rose-500"
                        } rounded-full flex items-center justify-center shadow-lg`}
                      >
                        {isAccepted || isMatch ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Heart className="w-3.5 h-3.5 text-white fill-white" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <p className="text-gray-900 text-sm leading-relaxed">
                          {isAccepted || isMatch ? (
                            <>
                              <span className="font-semibold hover:underline">
                                You
                              </span>
                              {" and "}
                              <span className="font-semibold hover:underline">
                                {request.sender_name || request.from}
                              </span>
                              {" are a match now! 🎉"}
                            </>
                          ) : (
                            <>
                              <span className="font-semibold hover:underline">
                                {request.sender_name || request.from}
                              </span>
                              {" liked your profile!"}
                            </>
                          )}
                        </p>

                        {request.type === "request" &&
                          (request.compatibility_score || request.score) && (
                            <Badge
                              className={`mt-1.5 text-xs px-2 py-0.5 text-white font-semibold ${getCompatibilityColor(
                                request.compatibility_score || request.score
                              )}`}
                            >
                              {Math.round(
                                request.compatibility_score || request.score
                              )}
                              % Compatible
                            </Badge>
                          )}

                        {!isMatch && !isAccepted && request.message && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2 italic">
                            "{request.message}"
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {request.sender_location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>
                                {(request.sender_location || "")
                                  .split(" ")
                                  .slice(0, 2)
                                  .join(" ")}
                              </span>
                            </div>
                          )}
                          {request.sender_profession && (
                            <div className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              <span>{request.sender_profession}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {!isAccepted && !isMatch && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={(e) => handleAccept(request, e)}
                            size="sm"
                            disabled={isProcessing}
                            className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 rounded-lg h-8 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                            ) : (
                              <Check className="w-3.5 h-3.5 mr-1" />
                            )}
                            Accept
                          </Button>

                          <Button
                            onClick={(e) => handleReject(request, e)}
                            size="sm"
                            variant="outline"
                            disabled={isProcessing}
                            className="flex-1 rounded-lg border-gray-300 hover:bg-gray-50 text-gray-700 h-8 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {(isAccepted || isMatch) && (
                        <div className="mt-3">
                          <Button
                            onClick={() => router.push("/chat")}
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 rounded-lg h-8 text-xs font-semibold"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" />
                            Send Message
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0 flex items-start gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3 mt-0.5" />
                      <span>{getTimeAgoKathmandu(request.created_at || new Date())}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Requests;