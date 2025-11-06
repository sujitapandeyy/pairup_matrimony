"use client";

import React, { useEffect, useState } from "react";
import { Heart, X, MapPin, Briefcase, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Badge } from "./ui/badge";

const ProfileCards = () => {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [randomProfiles, setRandomProfiles] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("pairupUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.email) setEmail(parsed.email);
      } catch {
        toast.error("Error parsing user from localStorage");
      }
    }
  }, []);

  const fetchSimilarProfiles = async () => {
    if (!email) return;

    try {
      const res = await api.get(
        `/matches/get_profiles?email=${encodeURIComponent(email)}`
      );
      const allProfiles = res.data.profiles.filter(
        (p: any) => p.email !== email
      );
      setProfiles(allProfiles);

      try {
        const simRes = await api.get(
          `/matches/similar_to_liked?email=${encodeURIComponent(email)}`
        );
        let similar = simRes.data || [];

        if (similar.length < 5) {
          const remaining = 5 - similar.length;
          const availableProfiles = allProfiles.filter(
            (p: any) => !similar.some((s: any) => s.email === p.email)
          );
          const random = [...availableProfiles]
            .sort(() => 0.5 - Math.random())
            .slice(0, remaining);
          similar = [...similar, ...random];
        }

        setRandomProfiles(similar.slice(0, 5));
      } catch {
        const random = [...allProfiles]
          .sort(() => 0.5 - Math.random())
          .slice(0, 5);
        setRandomProfiles(random);
      }

      // ✅ Restore last viewed profile if exists
      const lastViewed = sessionStorage.getItem("lastViewedProfile");
      if (lastViewed) {
        const idx = allProfiles.findIndex((p: any) => p.email === lastViewed);
        if (idx !== -1) {
          setCurrentIndex(idx);
          return;
        }
      }

      // fallback
      setCurrentIndex(0);
    } catch {
      toast.error("Failed to fetch profiles");
    }
  };

  useEffect(() => {
    if (email) {
      fetchSimilarProfiles();
    }
  }, [email]);

  const handleSwipe = async (liked: boolean): Promise<void> => {
    if (profiles.length === 0) return;
    const targetProfile = profiles[currentIndex];

    try {
      await api.post("/matches/swipe", {
        swiper_email: email,
        target_email: targetProfile.email,
        liked,
      });

      liked ? toast.success("Interest sent!") : toast.info("Skipped.");

      setProfiles((prev) => {
        const updated = prev.filter((_, idx) => idx !== currentIndex);
        const newIndex = currentIndex >= updated.length ? 0 : currentIndex;
        setCurrentIndex(newIndex);
        return updated;
      });

      if (liked) {
        await fetchSimilarProfiles();
      } else {
        setRandomProfiles((prev) => {
          let updated = prev.filter(
            (profile) => profile.email !== targetProfile.email
          );

          if (updated.length < 5) {
            const shownEmails = new Set([
              ...updated.map((p) => p.email),
              targetProfile.email,
            ]);

            const candidatesToAdd = profiles
              .filter((p) => !shownEmails.has(p.email))
              .sort(() => 0.5 - Math.random())
              .slice(0, 5 - updated.length);

            updated = [...updated, ...candidatesToAdd];
          }

          return updated.slice(0, 5);
        });
      }
    } catch {
      toast.error("Swipe failed");
    }
  };

  if (!email) return <div className="text-center py-10">Loading user...</div>;
  if (profiles.length === 0)
    return <div className="text-center py-10">No profiles found.</div>;

  const currentProfile = profiles[currentIndex];

  const onSmallCardClick = (profile: any) => {
    const idx = profiles.findIndex((p) => p.email === profile.email);
    if (idx !== -1) {
      setCurrentIndex(idx);
      sessionStorage.setItem("lastViewedProfile", profile.email); // ✅ Save when selecting from sidebar
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setProfiles((prev) => [...prev, profile]);
      setCurrentIndex(profiles.length);
      sessionStorage.setItem("lastViewedProfile", profile.email); // ✅ Save
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onBigImageClick = () => {
    if (currentProfile?.id || currentProfile?.email) {
      sessionStorage.setItem("lastViewedProfile", currentProfile.email); // ✅ Save before navigating
      router.push(`/user/${currentProfile.id || currentProfile.email}`);
    } else {
      toast.error("User identifier not found");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-10 px-4 py-10 w-full max-w-screen-xl mx-auto">
      <div className="flex-1 flex flex-col items-center gap-6">
        <Card className="w-full max-w-sm overflow-hidden shadow-2xl border-0 bg-white rounded-3xl transform transition-transform hover:scale-[1.02]">
          <div
            className="relative cursor-pointer h-[600px]"
            onClick={onBigImageClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onBigImageClick()
            }}
          >
            <img
              src={currentProfile.images?.[0] || '/default-profile.jpg'}
              alt={currentProfile.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none ">
              <h2 className="text-3xl font-bold mb-3">
                {currentProfile.name}, {currentProfile.age}
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{currentProfile.profession}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{(currentProfile.location || '').split(' ').slice(0, 2).join(' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>{currentProfile.education}</span>
                </div>
                <div className="flex items-center space-x-2 mt-3">
                  <Badge
                    className={`text-xs px-3 py-1 text-white ${
                      currentProfile.compatibility_score >= 90
                        ? 'bg-green-700'
                        : currentProfile.compatibility_score >= 80
                        ? 'bg-green-600'
                        : currentProfile.compatibility_score >= 70
                        ? 'bg-green-500'
                        : currentProfile.compatibility_score >= 60
                        ? 'bg-yellow-500'
                        : currentProfile.compatibility_score >= 50
                        ? 'bg-yellow-400'
                        : currentProfile.compatibility_score >= 40
                        ? 'bg-orange-400'
                        : currentProfile.compatibility_score >= 30
                        ? 'bg-orange-500'
                        : currentProfile.compatibility_score >= 20
                        ? 'bg-red-500'
                        : 'bg-red-600'
                    }`}
                  >
                    {currentProfile.compatibility_score}% Compatible
                  </Badge>
                </div>
                {Array.isArray(currentProfile.hobbies) &&
                  currentProfile.hobbies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {currentProfile.hobbies.slice(0, 3).map((hobby: string, i: number) => (
                        <span
                          key={i}
                          className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {hobby}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </Card>
        
        <div className="flex justify-center gap-6">
          <Button
            onClick={async (e) => {
              e.preventDefault()
              await handleSwipe(false)
            }}
            variant="outline"
            className="w-16 h-16 rounded-full border-2 border-red-500 hover:bg-red-50 bg-white shadow-lg"
          >
            <X className="w-7 h-7 text-red-500" />
          </Button>

          <Button
            onClick={async (e) => {
              e.preventDefault()
              await handleSwipe(true)
            }}
            className="w-16 h-16 rounded-full bg-pink-500 hover:bg-pink-600 text-white shadow-lg"
          >
            <Heart className="w-7 h-7 fill-white" />
          </Button>
        </div>
      </div>

      {/* Similar Users Sidebar */}
      <div className="w-full lg:w-[290px] space-y-6 bg-white p-9 rounded-3xl">
        <p className="font-bold text-gray-700">You might also Like :</p>
        {randomProfiles.map((profile) => (
          <div
            key={profile.email}
            className={`cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-lg transition bg-white flex items-center gap-4 p-3 ${
              profiles[currentIndex]?.email === profile.email
                ? "ring-2 ring-gray-500"
                : ""
            }`}
            onClick={() => onSmallCardClick(profile)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSmallCardClick(profile);
            }}
          >
            <img
              src={profile.images?.[0] || "/default-profile.jpg"}
              alt={profile.name}
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div className="flex flex-col">
              <h3 className="font-semibold text-base">{profile.name}</h3>
              <p className="text-xs text-gray-600">
                {profile.age} &middot;{" "}
                {(profile.location || "Unknown")
                  .split(" ")
                  .slice(0, 2)
                  .join(" ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileCards;
