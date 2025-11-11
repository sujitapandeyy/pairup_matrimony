'use client';

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { MapPin, Edit3, Camera, Calendar, X, Plus } from "lucide-react";
import { Profile, ProfilePageProps } from "./types";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProfileView from "./ProfileView";
import EditProfile from "./EditProfile";

function getFullImageUrl(photoPath?: string | null) {
  if (!photoPath) return null;
  if (photoPath.startsWith("/uploads/")) {
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${photoPath}?t=${Date.now()}`;
  }
  return photoPath;
}

type GalleryItem = {
  _id: string;
  url: string;
};

export default function ProfilePage({ userId }: ProfilePageProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Profile>>({ lookingFor: {} });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [selectedTab, setSelectedTab] = useState("Photos");
  const router = useRouter();

  // ---------------- FETCH PROFILE + GALLERY ---------------- //
  useEffect(() => {
    if (!userId) {
      toast.error("User ID is required");
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        const res = await api.get(`/api/user/profile/${userId}`);
        const data: Profile = res.data;
        setProfile(data);
        setFormData(data);
        setPhotoPreview(getFullImageUrl(data.photo));

        // Fetch gallery photos
        const galleryRes = await api.get(`/api/user/profile/${userId}/gallery`);
        const galleryData = galleryRes.data || [];
        const galleryItems = galleryData.map((g: any) => ({
          _id: g._id,
          url: getFullImageUrl(g.filepath),
        }));
        setGallery(galleryItems);
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Failed to load profile");
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  // ---------------- HANDLE PROFILE PHOTO (main) ---------------- //
  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    setUploadError(null);

    const formDataFile = new FormData();
    formDataFile.append("photo", file);

    try {
      const res = await api.post(`/api/user/profile/${userId}/upload-photo`, formDataFile);
      const data = res.data;
      const updatedUrl = getFullImageUrl(data.photo || data.photoUrl);

      setFormData((prev) => ({ ...prev, photo: data.photo }));
      setProfile((prev) => prev ? { ...prev, photo: data.photo } : null);
      setPhotoPreview(updatedUrl);
      toast.success("Profile photo uploaded successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to upload photo");
      setUploadError(err.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  // ---------------- HANDLE GALLERY PHOTO UPLOAD ---------------- //
  async function handleGalleryPhotoChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size should be less than 5MB');
      return;
    }

    const formDataFile = new FormData();
    formDataFile.append("photo", file);

    try {
      const res = await api.post(`/api/user/profile/${userId}/gallery`, formDataFile);
      const data = res.data;
      if (data._id && data.filepath) {
        const newPhoto: GalleryItem = {
          _id: data._id,
          url: getFullImageUrl(data.filepath) || '/placeholder.jpg',
        };
        setGallery((prev) => [...prev, newPhoto]);
      }
      toast.success("Gallery photo uploaded successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to upload gallery photo");
    }
  }

  // ---------------- DELETE GALLERY PHOTO ---------------- //
  async function handleDeletePhoto(index: number) {
    try {
      const confirmed = window.confirm("Are you sure you want to delete this photo?");
      if (!confirmed) return;

      const imageToDelete = gallery[index];
      if (!imageToDelete?._id) {
        toast.error("Failed to identify image");
        return;
      }

      await api.delete(`/api/user/profile/${userId}/gallery/${imageToDelete._id}`);
      toast.success("Photo deleted successfully");
      setGallery((prev) => prev.filter((_, i) => i !== index));
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to delete photo");
    }
  }

  // ---------------- FORM CHANGES ---------------- //
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
      const res = await api.put(`/api/user/profile/${userId}`, formData);
      toast.success("Profile updated successfully");
      const updatedProfile = res.data;
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Update failed: ${err.message}`);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading profile...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center text-red-500 bg-white p-8 rounded-xl shadow-lg">
        <p className="text-xl font-semibold mb-2">Oops! Something went wrong</p>
        <p>{error}</p>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center text-yellow-600 bg-white p-8 rounded-xl shadow-lg">
        <p className="text-xl font-semibold">No profile data found</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white ml-98">
      {/* Profile Section */}
      <div className="bg-white px-4 py-8">
        <div className="flex items-start gap-6">
          {/* Profile Photo */}
          <div className="relative flex-shrink-0">
            <div className="w-32 h-32 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-100 shadow-md">
              <img
                src={photoPreview || "/placeholder.jpg"}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Add Photo Button */}
            <label className="absolute bottom-0 right-0 bg-pink-500 hover:bg-pink-600 text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors">
              <Plus className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{profile.name}</h1>
            <p className="text-gray-500 text-sm mb-3">@{profile.name?.toLowerCase().replace(/\s+/g, '')}</p>
            <p className="text-gray-700 font-medium mb-4">{profile.caption}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 sticky top-0">
        <div className="flex gap-8">
          {["Photos", "Details","Looking For"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`py-4 px-2 font-medium text-sm transition-colors whitespace-nowrap ${
                selectedTab === tab
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white px-4 py-8">
        {selectedTab === "Photos" ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
              {gallery.map((photo, idx) => (
                <div
                  key={photo._id}
                  className="relative group aspect-square rounded-lg overflow-hidden bg-gray-200 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <img
                    src={photo.url}
                    alt={`Gallery ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => handleDeletePhoto(idx)}
                    className="absolute top-2 right-2 bg-white bg-opacity-50 text-black rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Photo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {/* Add More Photos Button */}
              <div className="flex justify-center">
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-pink-500 hover:bg-pink-50 transition-colors w-full max-w-xs text-center">
                  <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Add more photos</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryPhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        ) : selectedTab === "Details" ? (
          <div className="max-w-2xl">
            <div className="flex justify-end mb-4">
            <button
                onClick={() => {
                  setIsEditing((prev) => !prev);
                  if (!isEditing) setFormData(profile);
                  setPhotoPreview(profile.photo ? getFullImageUrl(profile.photo) : null);
                }}
                className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-2 rounded-full font-semibold transition-colors flex items-center space-x-1"
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4 text-white" />
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 text-white" />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
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
                showLookingFor={false}
                onEditClick={() => setIsEditing(true)}
              />
            )}
          </div>
        ) : selectedTab === "Looking For" ? (
  <div className="max-w-2xl">
    <div className="flex justify-end mb-4">
      <button
        onClick={() => {
          setIsEditing((prev) => !prev);
          if (!isEditing) setFormData(profile);
        }}
        className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-2 rounded-full font-semibold transition-colors flex items-center space-x-1"
      >
        {isEditing ? (
          <>
            <X className="h-4 w-4 text-white" />
            <span>Cancel</span>
          </>
        ) : (
          <>
            <Edit3 className="h-4 w-4 text-white" />
            <span>Edit Preferences</span>
          </>
        )}
      </button>
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
        showOnlyLookingFor={true}  // ✅ this tells EditProfile to show ONLY the Looking For section
      />
    ) : (
      <ProfileView
        profile={profile}
        showOnlyLookingFor={true}
        onEditClick={() => setIsEditing(true)}
      />
    )}
  </div>
) : null}

      </div>
    </div>
  );
}
