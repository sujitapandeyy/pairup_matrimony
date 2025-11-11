'use client';

import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { Heart, Briefcase, GraduationCap, Mail, Calendar, Users, Home, X, Church, Baby, ArrowLeft, MapPin, Ruler } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from "@/components/ui/badge";

interface UserViewProps {
  userId: string;
}

// Helper function for compatibility color
const getCompatibilityColor = (score: number): string => {
  if (score >= 90) return "bg-emerald-600";
  if (score >= 80) return "bg-green-600";
  if (score >= 70) return "bg-lime-600";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 50) return "bg-amber-500";
  if (score >= 40) return "bg-orange-500";
  if (score >= 30) return "bg-orange-600";
  if (score >= 20) return "bg-red-500";
  return "bg-red-700";
};

export default function UserView({ userId }: UserViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const scrollPosition = searchParams.get('scroll');
  const profileIndex = searchParams.get('index');

  const [activeTab, setActiveTab] = useState<'photos' | 'details' | 'looking'>('photos');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reason, setReason] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploadingPhoto] = useState(false);
  const [compatibilityScore, setCompatibilityScore] = useState<number | null>(null);

  // --- Helper to build full URL for images ---
  function getFullImageUrl(photoPath?: string | null) {
    if (!photoPath) return '/default-profile.jpg';
    if (photoPath.startsWith('/uploads/')) {
      return `${process.env.NEXT_PUBLIC_BACKEND_URL}${photoPath}?t=${Date.now()}`;
    }
    return photoPath;
  }

  // --- Fetch Profile + Compatibility ---
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get(`/api/user/profile/${userId}`);
        const data = res.data;
        setProfile(data);

        // Fetch compatibility score
        const storedUser = localStorage.getItem("pairupUser");
        if (storedUser) {
          try {
            const currentUser = JSON.parse(storedUser);
            if (currentUser?.email && data.email !== currentUser.email) {
              // Fetch all profiles to get compatibility score
              const profilesRes = await api.get(
                `/matches/get_profiles?email=${encodeURIComponent(currentUser.email)}`
              );
              const allProfiles = profilesRes.data.profiles;
              const matchedProfile = allProfiles.find((p: any) => p.email === data.email);
              if (matchedProfile?.compatibility_score !== undefined) {
                setCompatibilityScore(matchedProfile.compatibility_score);
              }
            }
          } catch (err) {
            console.error("Error fetching compatibility score:", err);
          }
        }
      } catch (error) {
        toast.error('Failed to fetch user profile');
      }
    }
    fetchProfile();
  }, [userId]);

  // --- Fetch Gallery ---
  useEffect(() => {
    async function fetchGallery() {
      try {
        const res = await api.get(`/api/user/profile/${userId}/gallery`);
        const galleryUrls = res.data.map((img: any) => getFullImageUrl(img.filepath));
        setGallery(galleryUrls);
      } catch (error) {
        toast.error('Failed to fetch gallery photos');
      }
    }
    fetchGallery();
  }, [userId]);

  const handleBack = () => {
    if (from) {
      const returnUrl = new URL(from, window.location.origin);
      returnUrl.searchParams.set('restoreIndex', profileIndex || '0');
      returnUrl.searchParams.set('restoreScroll', scrollPosition || '0');
      router.push(returnUrl.toString());
    } else {
      router.back();
    }
  };

  if (!profile) {
    return <div className="p-10 text-center text-gray-500">Loading profile...</div>;
  }

  const safe = (val: string | undefined | null) => val && val !== '' ? val : 'Not specified';
  const displayedPhoto = getFullImageUrl(profile.photo);

  // --- Report functions ---
  function openReportModal() {
    setShowReportModal(true);
    setReason('');
    setProofFile(null);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setProofFile(e.target.files[0]);
    }
  }

  async function handleReportSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmittingReport(true);

    if (!reason.trim()) {
      toast.error('Please provide a reason for reporting.');
      setSubmittingReport(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('reportedUserId', userId);
      formData.append('reason', reason);
      if (proofFile) formData.append('proof', proofFile);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/report`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        toast.error(errData.message || 'Failed to submit report');
      } else {
        toast.success('Report submitted successfully.');
        setShowReportModal(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Unexpected error');
    } finally {
      setSubmittingReport(false);
    }
  }

  return (
    <>
      {/* Back Button */}
      <div className="max-w-4xl mx-auto pt-6 px-4">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white overflow-hidden">
          
          {/* Profile Header Section */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-start gap-6">
              {/* Profile Picture */}
              <div className="relative flex-shrink-0">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                  <img
                    src={displayedPhoto}
                    alt={profile.name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-gray-900">{profile.name || 'User Profile'}</h1>
                  {/* Compatibility Badge */}
                  {compatibilityScore !== null && (
                    <Badge
                      className={`text-xs px-3 py-1.5 text-white font-semibold shadow-lg ${getCompatibilityColor(
                        compatibilityScore
                      )}`}
                    >
                      {compatibilityScore}% Compatible
                    </Badge>
                  )}
                </div>
                <p className="text-gray-500 text-lg mb-3">@{profile.username || profile.name?.toLowerCase().replace(/\s+/g, '')}</p>
                
                {/* Quick Info */}
                <div className="flex flex-wrap gap-4 text-gray-600 mb-4">
                  {profile.age && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">{profile.age} years old</span>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{profile.location}</span>
                    </div>
                  )}
                  {profile.height && (
                    <div className="flex items-center gap-1.5">
                      <Ruler className="h-4 w-4" />
                      <span className="text-sm">{profile.height}</span>
                    </div>
                  )}
                </div>

                {/* Hobbies */}
                {profile.hobbies?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.hobbies.map((hobby: string, idx: number) => (
                      <span 
                        key={idx} 
                        className="bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {hobby}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Report Button */}
              <button
                onClick={openReportModal}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-full shadow-md transition flex-shrink-0"
              >
                Report
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 px-8">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('photos')}
                className={`pb-4 font-semibold transition-colors relative ${
                  activeTab === 'photos'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Photos
                {activeTab === 'photos' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 rounded-t-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-4 font-semibold transition-colors relative ${
                  activeTab === 'details'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Details
                {activeTab === 'details' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 rounded-t-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('looking')}
                className={`pb-4 font-semibold transition-colors relative ${
                  activeTab === 'looking'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Looking For
                {activeTab === 'looking' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 rounded-t-full"></div>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Photos Tab */}
            {activeTab === 'photos' && (
              <div>
                {gallery.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {gallery.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-200 hover:opacity-90 transition cursor-pointer">
                        <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-12">No gallery photos uploaded</p>
                )}
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-8">
                {/* Personal Details */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-pink-500" />
                    Personal Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem icon={<Mail className="h-4 w-4" />} label="Email" value={safe(profile.email)} />
                    <DetailItem icon={<Calendar className="h-4 w-4" />} label="Age" value={safe(profile.age)} />
                    <DetailItem icon={<Users className="h-4 w-4" />} label="Gender" value={safe(profile.gender)} />
                    <DetailItem icon={<Ruler className="h-4 w-4" />} label="Height" value={safe(profile.height)} />
                    <DetailItem icon={<Church className="h-4 w-4" />} label="Caste" value={safe(profile.caste)} />
                    <DetailItem icon={<Baby className="h-4 w-4" />} label="Personality" value={safe(profile.personality)} />
                    <DetailItem icon={<Home className="h-4 w-4" />} label="Religion" value={safe(profile.religion)} />
                    <DetailItem icon={<Heart className="h-4 w-4" />} label="Marital Status" value={safe(profile.marital_status)} />
                  </div>
                </div>

                {/* Professional Details */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-blue-500" />
                    Professional & Education
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem icon={<GraduationCap className="h-4 w-4" />} label="Education" value={safe(profile.education)} />
                    <DetailItem icon={<Briefcase className="h-4 w-4" />} label="Profession" value={safe(profile.profession)} />
                  </div>
                </div>
              </div>
            )}

            {/* Looking For Tab */}
            {activeTab === 'looking' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Partner Preferences
                </h3>
                {profile.lookingFor && Object.keys(profile.lookingFor).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(profile.lookingFor).map(([key, value]) => (
                      <DetailItem
                        key={key}
                        icon={<Heart className="h-4 w-4" />}
                        label={key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                        value={Array.isArray(value) ? value.join(', ') : value?.toString() || 'N/A'}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-12">No preferences specified</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Report Modal --- */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 relative shadow-lg">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-bold mb-4">Report User</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="reason" className="block font-medium mb-1">Reason</label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-gray-300 p-2 resize-none"
                  placeholder="Describe the reason for reporting this user..."
                />
              </div>

              <div>
                <label htmlFor="proof" className="block font-medium mb-1">Proof (optional)</label>
                <input
                  id="proof"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full"
                />
                {proofFile && <p className="mt-1 text-sm text-gray-700">{proofFile.name}</p>}
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => handleReportSubmit(e as any)}
                  disabled={submittingReport}
                  className="px-6 py-2 rounded bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- DetailItem Component ---
function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 mb-0.5">{label}</p>
        <p className="text-base font-semibold text-gray-900 break-words">{value}</p>
      </div>
    </div>
  );
}