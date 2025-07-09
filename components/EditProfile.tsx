'use client';

import React, { ChangeEvent } from "react";
import { Heart, Camera, Check, X, Briefcase, GraduationCap, Users } from "lucide-react";
import { Profile } from "./types";
import api from '@/lib/api'
import { toast } from 'sonner'

interface EditProfileProps {
  profile: Profile;
  formData: Partial<Profile>;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onPhotoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFormChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  uploadingPhoto: boolean;
  uploadError: string | null;
  photoPreview: string | null;
}

const genderOptions = ["Male", "Female", "Other"];
const religionOptions = ["Hindu", "Muslim", "Christian", "Buddhist", "Sikh", "Jain", "Other"];
const maritalStatusOptions = ["Single", "Divorced", "Widowed", "Separated"];
const educationOptions = ["High School", "Diploma", "Bachelor's", "Master's", "PhD", "Other"];
const professionOptions = ["Student", "Engineer", "Doctor", "Teacher", "Business", "Artist", "Other"];
const ageGroupOptions = ["18-25", "26-35", "36-45", "46+"];

const lookingForOptions = {
  ageGroup: ageGroupOptions,
  gender: genderOptions,
  religion: religionOptions,
  maritalStatus: maritalStatusOptions,
  education: educationOptions,
  profession: professionOptions,
};

export default function EditProfile({
  profile,
  formData,
  onCancel,
  onSubmit,
  onPhotoChange,
  onFormChange,
  uploadingPhoto,
  uploadError,
  photoPreview,
}: EditProfileProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Camera className="h-6 w-6 text-blue-500" />
          Profile Photo
        </h3>
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
              <img
                src={photoPreview || "/default-profile.png"}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={uploadingPhoto}
              className={`absolute bottom-0 right-0 rounded-full p-2 cursor-pointer transition-all duration-200 shadow-lg ${
                uploadingPhoto ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              }`}
              title="Change Profile Photo"
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              id="photo-upload"
              accept="image/*"
              className="hidden"
              onChange={onPhotoChange}
              disabled={uploadingPhoto}
            />
          </div>
          {uploadError && (
            <p className="text-red-500 text-sm mt-2">{uploadError}</p>
          )}
          <p className="text-gray-500 text-sm mt-2">
            Click the camera icon to upload a new photo (max 5MB)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-pink-500" />
          Personal Information
        </h3>
        <div className="space-y-6">
          <InputField label="Full Name" name="name" value={formData.name ?? ""} onChange={onFormChange} />
          <SelectField label="Age Group" name="age" value={formData.age ?? ""} onChange={onFormChange} options={ageGroupOptions} />
          <SelectField label="Gender" name="gender" value={formData.gender ?? ""} onChange={onFormChange} options={genderOptions} />
          <SelectField label="Religion" name="religion" value={formData.religion ?? ""} onChange={onFormChange} options={religionOptions} />
          <SelectField label="Marital Status" name="maritalStatus" value={formData.maritalStatus ?? ""} onChange={onFormChange} options={maritalStatusOptions} />
          <InputField label="Location" name="location" value={formData.location ?? ""} onChange={onFormChange} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-purple-500" />
          Professional Details
        </h3>
        <div className="space-y-6">
          <SelectField label="Education" name="education" value={formData.education ?? ""} onChange={onFormChange} options={educationOptions} />
          <SelectField label="Profession" name="profession" value={formData.profession ?? ""} onChange={onFormChange} options={professionOptions} />
          <TextAreaField 
            label="About Me" 
            name="caption" 
            value={formData.caption ?? ""} 
            onChange={onFormChange} 
            placeholder="Tell us about yourself, your interests, and what you're looking for..." 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500" />
          Partner Preferences
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <SelectField label="Age Group" name="lookingFor.ageGroup" value={formData.lookingFor?.ageGroup ?? ""} onChange={onFormChange} options={lookingForOptions.ageGroup} />
          <SelectField label="Gender" name="lookingFor.gender" value={formData.lookingFor?.gender ?? ""} onChange={onFormChange} options={lookingForOptions.gender} />
          <SelectField label="Religion" name="lookingFor.religion" value={formData.lookingFor?.religion ?? ""} onChange={onFormChange} options={lookingForOptions.religion} />
          <SelectField label="Marital Status" name="lookingFor.maritalStatus" value={formData.lookingFor?.maritalStatus ?? ""} onChange={onFormChange} options={lookingForOptions.maritalStatus} />
          <SelectField label="Education" name="lookingFor.education" value={formData.lookingFor?.education ?? ""} onChange={onFormChange} options={lookingForOptions.education} />
          <SelectField label="Profession" name="lookingFor.profession" value={formData.lookingFor?.profession ?? ""} onChange={onFormChange} options={lookingForOptions.profession} />
        </div>
      </div>

      <div className="flex justify-center gap-4">
        {/* <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 text-gray-800 px-8 py-3 rounded-full hover:bg-gray-300 transition-all duration-200 flex items-center gap-2 text-lg font-semibold shadow"
        >
          <X className="h-5 w-5" />
          Cancel
        </button> */}
        <button
          type="submit"
          disabled={uploadingPhoto}
          className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-full hover:from-pink-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 text-lg font-semibold shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="h-5 w-5" />
          {uploadingPhoto ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700" htmlFor={name}>
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700" htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
      >
        <option value="">Select {label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        rows={4}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
      />
    </div>
  );
}