'use client';

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { MapPin, Edit3, Camera, Calendar, X } from "lucide-react";
import ProfileView from "./ProfileView";
import EditProfile from "./EditProfile";
import { Profile, ProfilePageProps } from "./types";

const backendUrl = "http://localhost:5050";

const ageGroupOptions = ["18-25", "26-35", "36-45", "46+"];

function getFullImageUrl(photoPath?: string | null) {
  if (!photoPath) return "/default-profile.png";
  if (photoPath.startsWith("/uploads/")) {
    return `${backendUrl}${photoPath}?t=${Date.now()}`;
  }
  return photoPath;
}

export default function ProfilePage({ userId }: ProfilePageProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Profile>>({ lookingFor: {} });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setError("User ID is required");
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        const res = await fetch(`${backendUrl}/api/user/profile/${userId}`, {
          credentials: 'include'
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch profile");
        }
        const data: Profile = await res.json();
        setProfile(data);
        setFormData(data);
        setPhotoPreview(getFullImageUrl(data.photo));
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
      setPhotoPreview(getFullImageUrl(profile.photo));
    }
  }, [profile]);

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const MAX_FILE_SIZE = 5 * 1024 * 1024; 
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size should be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    const formDataFile = new FormData();
    formDataFile.append("photo", file);

    try {
      const res = await fetch(`${backendUrl}/api/user/profile/${userId}/upload-photo`, {
        method: "POST",
        body: formDataFile,
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Photo upload failed");
      }

      const data = await res.json();
      const updatedUrl = getFullImageUrl(data.photoUrl);
      setFormData((prev) => ({ ...prev, photo: data.photoUrl }));
      setProfile((prev) => prev ? { ...prev, photo: data.photoUrl } : null);
      setPhotoPreview(updatedUrl);
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setUploadError(err.message || "Failed to upload photo");
      setPhotoPreview(profile?.photo ? getFullImageUrl(profile.photo) : null);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    if (name.startsWith("lookingFor.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        lookingFor: {
          ...prev.lookingFor,
          [key]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/api/user/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const updatedProfile = await res.json();
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  }

  const displayedPhoto = photoPreview || "/default-profile.png";

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading profile...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="text-center text-red-500 bg-white p-8 rounded-xl shadow-lg">
        <p className="text-xl font-semibold mb-2">Oops! Something went wrong</p>
        <p>{error}</p>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="text-center text-yellow-600 bg-white p-8 rounded-xl shadow-lg">
        <p className="text-xl font-semibold">No profile data found</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <div className="relative h-80 bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500 overflow-hidden">
        <div className="absolute inset-0 bg-pink-800 bg-opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

        <div className="absolute bottom-0 mb-20 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <div className="w-40 h-40 rounded-full border-6 border-white shadow-xl overflow-hidden bg-white relative">
            <img
              src={displayedPhoto}
              alt="Profile"
              className="w-full h-full object-cover"
            />
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-6 right-6">
          <button
            onClick={() => {
              setIsEditing((prev) => !prev);
              if (!isEditing) setFormData(profile);
              setPhotoPreview(profile.photo ? getFullImageUrl(profile.photo) : null);
            }}
            className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-6 py-3 rounded-full hover:bg-opacity-30 transition-all duration-200 flex items-center gap-2 font-medium"
          >
            {isEditing ? (
              <div className="flex items-center space-x-1 font-bold text-black cursor-pointer hover:text-gray-600 transition-colors duration-300">
                <X className="h-4 w-4 text-black hover:text-gray-600 font-bold transition-colors duration-300" />
                <span>Cancel</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 font-bold text-black cursor-pointer hover:text-gray-600 transition-colors duration-300">
                <Edit3 className="h-4 w-4 text-black hover:text-gray-600 font-bold transition-colors duration-300" />
                <span>Edit Profile</span>
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{profile.name}</h1>
          {profile.caption && (
            <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
              {profile.caption}
            </p>
          )}
          <div className="flex items-center justify-center gap-4 mt-4 text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{profile.age} years</span>
            </div>
          </div>
        </div>

        {isEditing ? (
          <EditProfile
            profile={profile}
            formData={formData}
            onCancel={() => setIsEditing(false)}
            onSubmit={handleSubmit}
            onPhotoChange={handlePhotoChange}
            onFormChange={handleChange}
            uploadingPhoto={uploadingPhoto}
            uploadError={uploadError}
            photoPreview={photoPreview}
          />
        ) : (
          <ProfileView
            profile={profile}
            onEditClick={() => setIsEditing(true)}
          />
        )}
      </div>
    </div>
  );
}
