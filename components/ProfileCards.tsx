"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Heart,
  X,
  MapPin,
  Briefcase,
  GraduationCap,
  Loader2,
  Star,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getCompatibilityColor } from "@/lib/utils/match";
import { getFullImageUrl } from "@/lib/utils/image";
import { getTimeAgoKathmandu } from "@/lib/utils/date";

// Types
interface Profile {
  id?: string;
  email: string;
  name: string;
  age: number;
  profession?: string;
  location?: string;
  education?: string;
  images?: string[];
  hobbies?: string[];
  compatibility_score?: number;
  distance_km?: number;
  is_compatible?: boolean;
}

// Constants
const MAX_SUGGESTED_PROFILES = 4;
const MAX_NEARBY_PROFILES = 4;
const DEFAULT_IMAGE = "/default-profile.jpg";

const formatLocation = (location: string | undefined): string => {
  if (!location) return "Unknown";
  return location.split(" ").slice(0, 2).join(" ");
};

const getUsernameFromName = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, "_");
};

const ProfileCards: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  // State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [suggestedProfiles, setSuggestedProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);
  const [nearbyProfiles, setNearbyProfiles] = useState<Profile[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(true);

  // Get email from session
  const email = session?.user?.email;

  const fetchNearbyProfiles = useCallback(async () => {
    if (!email) return;
    setNearbyLoading(true);

    try {
      const res = await api.get(
        `/matches/people_near_you?email=${encodeURIComponent(email)}`
      );

      const data = res.data;

      if (data.candidates) {
        setNearbyProfiles(data.candidates.slice(0, MAX_NEARBY_PROFILES));
      }

      if (data.skipped && data.skipped.length > 0) {
        console.log("Skipped nearby profiles:", data.skipped);
      }
    } catch (error) {
      console.error("Error fetching nearby profiles:", error);
      toast.error("Failed to load nearby profiles");
    } finally {
      setNearbyLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (email) fetchNearbyProfiles();
  }, [email, fetchNearbyProfiles]);

  const fetchSuggestedProfiles = useCallback(
    async (userEmail: string, allProfiles: Profile[]): Promise<Profile[]> => {
      try {
        const res = await api.get(
          `/matches/recommended_users?email=${encodeURIComponent(userEmail)}`
        );
        let similar: Profile[] = res.data || [];
        return similar.slice(0, MAX_SUGGESTED_PROFILES);
      } catch (error) {
        console.error("Error fetching similar profiles:", error);
        return [];
      }
    },
    []
  );

  // Fetch all profiles
  const fetchProfiles = useCallback(async () => {
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await api.get(
        `/matches/get_profiles?email=${encodeURIComponent(email)}`
      );
      const allProfiles: Profile[] = res.data.profiles.filter(
  (p: Profile) => p.email !== email
);

const compatibleProfiles = allProfiles.filter((p: Profile) => {
  const isCompatible = p.is_compatible !== false;
  const compatibilityScore = p.compatibility_score;
  
  return isCompatible && compatibilityScore && compatibilityScore > 0;
});

const sortedProfiles = [...compatibleProfiles].sort((a, b) => {
  const scoreA = a.compatibility_score ?? 0;
  const scoreB = b.compatibility_score ?? 0;
  return scoreB - scoreA;
});

      setProfiles(sortedProfiles);

      const suggested = await fetchSuggestedProfiles(email, sortedProfiles);
      setSuggestedProfiles(suggested);

      // Handle returning from profile page
      const lastViewed = sessionStorage.getItem("lastViewedProfile");
      const returningFromProfile = sessionStorage.getItem("returningFromProfile");

      if (lastViewed && returningFromProfile === "true") {
        const idx = sortedProfiles.findIndex((p) => p.email === lastViewed);
        if (idx !== -1) {
          setCurrentIndex(idx);
          sessionStorage.removeItem("returningFromProfile");
          return;
        }
      }

      setCurrentIndex(0);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Failed to load profiles");
    } finally {
      setIsLoading(false);
    }
  }, [email, fetchSuggestedProfiles]);
// Add this useEffect to periodically refresh suggestions (optional)
useEffect(() => {
  if (!email) return;

  // Refresh suggestions every 30 seconds if user has likes
  const interval = setInterval(async () => {
    if (suggestedProfiles.length > 0) {
      const suggested = await fetchSuggestedProfiles(email, profiles);
      setSuggestedProfiles(suggested);
    }
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, [email, profiles, suggestedProfiles.length, fetchSuggestedProfiles]);
  useEffect(() => {
    if (email) fetchProfiles();
  }, [email, fetchProfiles]);

  // Handle swipe
  const handleSwipe = async (liked: boolean) => {
    if (profiles.length === 0 || isSwiping) return;

    const targetProfile = profiles[currentIndex];
    setIsSwiping(true);

    try {
      await api.post("/matches/swipe", {
        swiper_email: email,
        target_email: targetProfile.email,
        liked,
      });

      toast.success(liked ? "Interest sent! 💖" : "Passed");

      setProfiles((prev) => {
        const updated = prev.filter((_, idx) => idx !== currentIndex);
        const newIndex = currentIndex >= updated.length ? 0 : currentIndex;
        setCurrentIndex(newIndex);
        return updated;
      });

      if (liked && email) {
        const suggested = await fetchSuggestedProfiles(email, profiles);
        setSuggestedProfiles(suggested);
      } else {
        //  Don't add random unfiltered profiles to suggested
        setSuggestedProfiles((prev) =>
          prev.filter((p) => p.email !== targetProfile.email)
        );
      }
      await fetchNearbyProfiles(); 

      // setNearbyProfiles((prev) =>
      //   prev.filter((p) => p.email !== targetProfile.email)
      // );
    } catch (error) {
      console.error("Swipe error:", error);
      toast.error("Failed to process swipe");
    } finally {
      setIsSwiping(false);
    }
  };

  // Navigate to profile
  const navigateToProfile = useCallback(
    (profile: Profile) => {
      const idx = profiles.findIndex((p) => p.email === profile.email);
      if (idx !== -1) {
        setCurrentIndex(idx);
      } else {
        setProfiles((prev) => [...prev, profile]);
        setCurrentIndex(profiles.length);
      }
      sessionStorage.setItem("lastViewedProfile", profile.email);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [profiles]
  );

  // View full profile
  const viewFullProfile = useCallback(() => {
    const currentProfile = profiles[currentIndex];
    if (currentProfile?.id || currentProfile?.email) {
      sessionStorage.setItem("lastViewedProfile", currentProfile.email);
      sessionStorage.setItem("returningFromProfile", "true");
      router.push(`/user/${currentProfile.id || currentProfile.email}`);
    } else {
      toast.error("Profile not found");
    }
  }, [currentIndex, profiles, router]);

  // Open profile directly
  const openProfileDirectly = (profile: Profile) => {
    sessionStorage.setItem("lastViewedProfile", profile.email);
    sessionStorage.setItem("returningFromProfile", "true");
    router.push(`/user/${profile.id || profile.email}`);
  };

  // Loading states
  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="text-center py-10 text-gray-600">
        Please log in to view profiles
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-gray-600 mb-4">No more profiles to show</div>
        <Button onClick={fetchProfiles} variant="outline">
          Refresh
        </Button>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div className="flex flex-col gap-6 px-4 pb-8 w-full max-w-screen-xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Profile Card */}
        <div className="flex-1 flex flex-col items-center gap-6">
          <div className="w-4/8 flex-1 flex flex-col items-center gap-6 rounded-3xl ml-50">
            <Card className="p-2 max-w-md overflow-hidden shadow-2xl border-0 rounded-3xl transform transition-all duration-300">
              <div
                className="relative cursor-pointer h-[600px] group rounded-3xl"
                onClick={viewFullProfile}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    viewFullProfile();
                  }
                }}
              >
                <img
                  src={currentProfile.images?.[0] || DEFAULT_IMAGE}
                  alt={currentProfile.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-101 rounded-3xl shadow-xl shadow-pink-100"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent rounded-3xl transition-transform duration-500 group-hover:scale-101" />

                {/* Profile info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
                  <h2 className="text-3xl font-bold mb-3 drop-shadow-lg">
                    {currentProfile.name}, {currentProfile.age}
                  </h2>

                  <div className="space-y-2.5 text-sm">
                    {currentProfile.profession && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {currentProfile.profession}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        {formatLocation(currentProfile.location)}
                      </span>
                    </div>

                    {currentProfile.education && (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {currentProfile.education}
                        </span>
                      </div>
                    )}

                    {/* Compatibility Badge */}
                    {currentProfile.compatibility_score !== undefined && (
                      <div className="flex items-center mt-3">
                        <Badge
                          className={`text-xs px-3 py-1.5 text-white font-semibold shadow-lg ${getCompatibilityColor(
                            currentProfile.compatibility_score
                          )}`}
                        >
                          {currentProfile.compatibility_score}% Compatible
                        </Badge>
                      </div>
                    )}

                    {/* Hobbies */}
                    {Array.isArray(currentProfile.hobbies) &&
                      currentProfile.hobbies.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {currentProfile.hobbies
                            .slice(0, 3)
                            .map((hobby, i) => (
                              <span
                                key={i}
                                className="bg-white/25 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm"
                              >
                                {hobby}
                              </span>
                            ))}
                        </div>
                      )}
                  </div>
                </div>

                {/* Click hint */}
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  View Profile
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-5">
                <Button
                  onClick={() => handleSwipe(false)}
                  disabled={isSwiping}
                  variant="outline"
                  className="w-16 h-16 rounded-full border-0 bg-white hover:bg-gray-50 shadow-lg shadow-red-100 hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSwiping ? (
                    <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                  ) : (
                    <X className="w-6 h-6 text-red-500" />
                  )}
                </Button>

                <Button
                  onClick={() => handleSwipe(true)}
                  disabled={isSwiping}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-100 hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border-0"
                >
                  {isSwiping ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Heart className="w-6 h-6 fill-white" />
                  )}
                </Button>

                <Button
                  disabled={isSwiping}
                  variant="outline"
                  className="w-16 h-16 rounded-full border-0 bg-white hover:bg-gray-50 shadow-lg shadow-blue-100 hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Star className="w-6 h-6 text-purple-500" />
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[360px] space-y-6">
          {/* Suggested Users */}
          {suggestedProfiles.length > 0 && (
  <div className="p-2">
    <h3 className="text-sm font-semibold text-gray-700 mb-4">
      Suggested for you
    </h3>
    <div className="flex gap-4 overflow-x-auto pb-2 ml-2 scrollbar-hide">
      {suggestedProfiles.map((profile) => (
        <div
          key={profile.email}
          className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 group"
          onClick={() => navigateToProfile(profile)}
        >
          <div
            className={`w-16 h-16 rounded-full p-[px] transition-all duration-300 ${
              currentProfile?.email === profile.email
                ? "object-cover ring-2 ring-gray-200 group-hover:ring-pink-200 scale-105"
                : "object-cover ring-2 ring-gray-200 group-hover:ring-pink-200"
            }`}
          >
            <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
              <img
                src={profile.images?.[0] || DEFAULT_IMAGE}
                alt={profile.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          </div>
          <span className="text-xs text-gray-700 max-w-[70px] truncate font-medium">
            {profile.name.split(" ")[0]}
          </span>
        </div>
      ))}
    </div>
  </div>
)}

          {/* People Near You */}
          <div className="space-y-3 bg-white p-4 rounded-3xl">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              People Near you
            </h3>
            {nearbyLoading ? (
              <p className="text-xs text-gray-500">Loading nearby people...</p>
            ) : nearbyProfiles.length === 0 ? (
              <p className="text-xs text-gray-500">
                No nearby people found. Update your preferences!
              </p>
            ) : (
              nearbyProfiles.map((profile) => (
                <div
                  key={profile.email}
                  className="flex items-center justify-between group hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 space-y-5"
                    onClick={() => navigateToProfile(profile)}
                  >
                    <img
                      src={profile.images?.[0] || DEFAULT_IMAGE}
                      alt={profile.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-pink-200 transition-all"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {getUsernameFromName(profile.name)}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">
                        {formatLocation(profile.location)}
                      </p>
                      {profile.distance_km && (
                        <p className="text-xs text-gray-400">
                          {profile.distance_km} km away
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      openProfileDirectly(profile);
                    }}
                    className="text-xs font-semibold text-pink-600 hover:text-pink-700 bg-transparent hover:bg-transparent p-0 h-auto transition-colors"
                  >
                    View
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCards;