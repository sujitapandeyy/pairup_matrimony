'use client';

import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { Heart, Briefcase, GraduationCap, Mail, Calendar, Users, Home, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface UserViewProps {
  userId: string;
}

export default function UserView({ userId }: UserViewProps) {
  const [profile, setProfile] = useState<any>(null);
  const [uploadingPhoto] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reason, setReason] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get(`/api/user/profile/${userId}`);
        setProfile(res.data);
      } catch (error) {
        toast.error('Failed to fetch user profile:');
      }
    }
    fetchProfile();
  }, [userId]);

  if (!profile) {
    return <div className="p-10 text-center text-gray-500">Loading profile...</div>;
  }

  const safe = (val: string | undefined | null) => val && val !== '' ? val : 'Not specified';
  const displayedPhoto = profile.photo || '/default-profile.jpg';

  function openReportModal() {
    setShowReportModal(true);
    setReason('');
    setProofFile(null);
    setReportError(null);
    setReportSuccess(null);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setProofFile(e.target.files[0]);
    }
  }

  async function handleReportSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmittingReport(true);
    setReportError(null);
    setReportSuccess(null);

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
      }

      toast.success('Report submitted successfully.');
      setShowReportModal(false);
      setReason('');
      setProofFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Unexpected error');
    } finally {
      setSubmittingReport(false);
    }
  }

  return (
    <>
      <div className="max-w-3xl rounded-2xl mx-auto relative h-80 bg-gradient-to-br from-pink-200 via-white to-red-200 shadow overflow-hidden mb-10 mt-7">
        <div className="absolute bottom-0 mb-20 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <div className="w-40 h-40 rounded-full border-6 border-white shadow-xl overflow-hidden bg-white relative">
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
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <button
            onClick={openReportModal}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-full shadow-lg transition"
          >
            Report
          </button>
        </div>
      </div>
        <div className="text-center mb-19">
            <h1 className="text-3xl font-bold text-gray-800">{profile.name || 'User Profile'}</h1>
            <p className="text-gray-600 mt-2">
            {profile.age ? `${profile.age} years old` : 'Age not specified'} | {profile.location || 'Location not specified'}
            </p>
            </div>
      <div className="max-w-3xl mx-auto p-8 space-y-8 -mt-24">
        <InfoCard title="Personal Details" icon={<Users className="h-6 w-6 text-pink-500" />}>
          <DetailItem icon={<Mail className="h-4 w-4" />} label="Email" value={safe(profile.email)} />
          <DetailItem icon={<Calendar className="h-4 w-4" />} label="Age" value={safe(profile.age)} />
          <DetailItem icon={<Users className="h-4 w-4" />} label="Gender" value={safe(profile.gender)} />
          <DetailItem icon={<Home className="h-4 w-4" />} label="Religion" value={safe(profile.religion)} />
          <DetailItem icon={<Heart className="h-4 w-4" />} label="Marital Status" value={safe(profile.marital_status)} />
        </InfoCard>

        <InfoCard title="Professional Details" icon={<Briefcase className="h-6 w-6 text-purple-500" />}>
          <DetailItem icon={<GraduationCap className="h-4 w-4" />} label="Education" value={safe(profile.education)} />
          <DetailItem icon={<Briefcase className="h-4 w-4" />} label="Profession" value={safe(profile.profession)} />
          {profile.personality && profile.personality.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-800 mb-3">Personality Traits</h4>
              <div className="flex flex-wrap gap-2">
                {profile.personality.map((trait: string, idx: number) => (
                  <span
                    key={idx}
                    className="bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}
        </InfoCard>

        <InfoCard title="Looking For" icon={<Heart className="h-6 w-6 text-red-500" />}>
          {profile.lookingFor && Object.keys(profile.lookingFor).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(profile.lookingFor).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="font-medium text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className="text-gray-800 font-medium">
                    {Array.isArray(value) ? value.join(', ') : value?.toString() || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No preferences specified</p>
          )}
        </InfoCard>
      </div>

      {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-xs">

          <div className="bg-white rounded-xl max-w-lg w-full p-6 relative shadow-lg">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-bold mb-4">Report User</h2>

            {reportError && <p className="text-red-600 mb-2">{reportError}</p>}
            {reportSuccess && <p className="text-green-600 mb-2">{reportSuccess}</p>}

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label htmlFor="reason" className="block font-medium mb-1">Reason</label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
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
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-6 py-2 rounded bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-200">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <span className="font-medium text-gray-600">{label}:</span>
      </div>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}
