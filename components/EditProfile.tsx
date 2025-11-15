'use client';

import React, { ChangeEvent, useRef } from "react";
import dynamic from 'next/dynamic';
import { Heart, Camera, Check, Briefcase, Users } from "lucide-react";
import { Profile } from "./types";
import { toast } from 'sonner';

const LocationInput = dynamic(() => import('@/components/LocationInput'), { ssr: false });

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
  showOnlyLookingFor?: boolean;
}

const genderOptions = ["Male", "Female", "Any"];
const religionOptions = ["Hindu", "Muslim", "Christian", "Buddhist", "Sikh", "Jain", "Other"];
const hobbiesOptions = ["Traveling","Cooking","Art","Music","Fitness","Gaming","Movies","Adventure Sports","Dancing","Reading","Photography","Gardening","Volunteering","Technology","Writing","Pets","Fashion","Spirituality","Blogging","Languages"];
const personalityOptions = ["Homebody","Social Butterfly","Balanced"];
const casteOptions = ["Brahmin", "Chhetri", "Thakuri", "Newar","Tamang","Magar","Rai","Limbu","Sherpa","Gurung","Tharu","Madhesi", "Muslim","Dalit","Other"];
const heightOptions = ["5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\""];
const maritalStatusOptions = ["Single", "Divorced", "Widowed"];
const educationOptions = ["High School", "Diploma", "Bachelor's", "Master's", "PhD"];
const familyTypeOptions = ["Joint", "Nuclear"];
const ageGroupOptions = Array.from({ length: 50 - 18 + 1 }, (_, i) => String(18 + i));

const getNestedValue = (obj: Partial<Profile>, path: string): string | undefined => {
    const parts = path.split('.');
    let current = obj as any;
    for (const part of parts) {
        if (!current || typeof current !== 'object' || !(part in current)) {
            return undefined;
        }
        current = current[part];
    }
    if (Array.isArray(current)) return current.join(', ');
    return (current !== null && current !== undefined) ? String(current) : undefined;
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
  showOnlyLookingFor = false,
}: EditProfileProps) {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handlePhotoClick = () => fileInputRef.current?.click();

  const renderRangeSelect = (label: string, fromName: string, toName: string, options: string[], parentName: string) => {
    let fromValue = getNestedValue(formData, fromName) || "";
    let toValue = getNestedValue(formData, toName) || "";

    if (!fromValue && !toValue) {
      const parentValue = getNestedValue(formData, parentName);
      if (parentValue && typeof parentValue === 'string' && (parentValue.includes('-') || parentValue.includes('–'))) {
        const parts = parentValue.split(/[-–]/).map(p => p.trim());
        if (parts.length === 2) {
          fromValue = options.includes(parts[0]) ? parts[0] : "";
          toValue = options.includes(parts[1]) ? parts[1] : "";
        }
      }
    }

    const handleChange = (from: string, to: string) => {
      onFormChange({ target: { name: fromName, value: from } } as any);
      onFormChange({ target: { name: toName, value: to } } as any);
      const combinedValue = from && to ? `${from}-${to}` : from || to || "";
      onFormChange({ target: { name: parentName, value: combinedValue } } as any);
    }

    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">{label}</label>
        <div className="flex gap-3">
          <select
            className="w-1/2 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 bg-gray-50"
            value={fromValue}
            onChange={(e) => handleChange(e.target.value, toValue)}
          >
            <option value="">From</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select
            className="w-1/2 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 bg-gray-50"
            value={toValue}
            onChange={(e) => handleChange(fromValue, e.target.value)}
          >
            <option value="">To</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
    )
  }

  const renderCastePills = (selectedCastes: string[], parentName: string) => (
    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
      {casteOptions.map(caste => {
        const isChecked = selectedCastes.includes(caste);
        return (
          <label key={caste} className={`cursor-pointer rounded-lg px-4 py-2 border transition ${isChecked ? "bg-green-700 text-white border-green-700" : "border-gray-300 text-gray-700 hover:bg-green-100"}`}>
            <input
              type="checkbox"
              value={caste}
              checked={isChecked}
              onChange={() => {
                let newCastes = [...selectedCastes];
                if (isChecked) newCastes = newCastes.filter(c => c !== caste);
                else newCastes.push(caste);
                onFormChange({ target: { name: parentName, value: newCastes.join(', ') } } as any);
              }}
              className="hidden"
            />
            {caste}
          </label>
        )
      })}
    </div>
  );

  const getCasteArray = (value: any) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {!showOnlyLookingFor && (
        <>
          {/* Profile Photo */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Camera className="h-6 w-6 text-blue-500" /> Profile Photo
            </h3>
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                  <img src={photoPreview || profile.photo || "/default-profile.png"} alt="Profile preview" className="w-full h-full object-cover"/>
                  {uploadingPhoto && <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>}
                </div>
                <button type="button" onClick={handlePhotoClick} disabled={uploadingPhoto} className={`absolute bottom-0 right-0 rounded-full p-2 shadow-lg ${uploadingPhoto ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}>
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={onPhotoChange} disabled={uploadingPhoto}/>
              </div>
              {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Users className="h-6 w-6 text-pink-500" /> Personal Information
            </h3>
            <InputField label="Full Name" name="name" value={formData.name ?? ""} onChange={onFormChange} />
            <SelectField label="Age" name="age" value={formData.age ?? ""} onChange={onFormChange} options={ageGroupOptions} /> 
            <SelectField label="Height" name="height" value={formData.height ?? ""} onChange={onFormChange} options={heightOptions} />
            <SelectField label="Gender" name="gender" value={formData.gender ?? ""} onChange={onFormChange} options={genderOptions} />
            <SelectField label="Religion" name="religion" value={formData.religion ?? ""} onChange={onFormChange} options={religionOptions} />
            <SelectField label="Religion" name="religion" value={formData.religion ?? ""} onChange={onFormChange} options={religionOptions} />
            <SelectField label="Caste" name="caste" value={formData.caste ?? ""} onChange={onFormChange} options={casteOptions} />
            <SelectField label="Marital Status" name="maritalStatus" value={formData.maritalStatus ?? ""} onChange={onFormChange} options={maritalStatusOptions} />

            <MultiSelectPills
              label="Hobbies"
              options={hobbiesOptions}
              selectedValues={getCasteArray(formData.hobbies)}
              onChange={vals => onFormChange({ target: { name: 'hobbies', value: vals.join(', ') } } as any)}
            />

            {/* <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Caste</label>
              {renderCastePills(getCasteArray(formData.caste), 'caste')}
            </div>

            <MultiSelectPills
              label="Marital Status"
              options={maritalStatusOptions}
              selectedValues={getCasteArray(formData.maritalStatus)}
              onChange={vals => onFormChange({ target: { name: 'maritalStatus', value: vals.join(', ') } } as any)}
            /> */}

            <TextAreaField label="About Me" name="caption" value={formData.caption ?? ""} onChange={onFormChange} placeholder="Tell us about yourself..." />
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Location</label>
              <LocationInput value={formData.location || ''} onSelect={(loc) => {
                onFormChange({ target: { name: 'location', value: loc.display_name } } as any)
                onFormChange({ target: { name: 'latitude', value: loc.lat } } as any)
                onFormChange({ target: { name: 'longitude', value: loc.lon } } as any)
              }} />
            </div>
          </div>

          {/* Professional Info */}
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-purple-500" /> Professional Details
            </h3>
            <SelectField label="Education" name="education" value={formData.education ?? ""} onChange={onFormChange} options={educationOptions} />
            <InputField label="Profession" name="profession" value={formData.profession ?? ""} onChange={onFormChange} />
          </div>
        </>
      )}

      {/* Partner Preferences */}
      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500" /> Partner Preferences
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {renderRangeSelect("Age", "lookingFor.age_from", "lookingFor.age_to", ageGroupOptions, "lookingFor.age_group")}
          {renderRangeSelect("Height",  "lookingFor.height_from", "lookingFor.height_to", heightOptions, "lookingFor.height")}

          <SelectField label="Gender" name="lookingFor.gender" value={formData.lookingFor?.gender ?? ""} onChange={onFormChange} options={genderOptions} />
          <SelectField label="Personality" name="lookingFor.personality" value={formData.lookingFor?.personality ?? ""} onChange={onFormChange} options={personalityOptions} />
          <SelectField label="Pet Preference" name="lookingFor.pet_preference" value={formData.lookingFor?.pet_preference ?? ""} onChange={onFormChange} options={["Love Them","Usually don't prefer"]} />
          <SelectField label="Education Level" name="lookingFor.education_level" value={formData.lookingFor?.education_level ?? ""} onChange={onFormChange} options={educationOptions} />
          <InputField label="Profession" name="lookingFor.profession" value={formData.lookingFor?.profession ?? ""} onChange={onFormChange} />
          <SelectField label="Family Type" name="lookingFor.family_type" value={formData.lookingFor?.family_type ?? ""} onChange={onFormChange} options={familyTypeOptions} />
          <SelectField label="Family Values" name="lookingFor.family_values" value={formData.lookingFor?.family_values ?? ""} onChange={onFormChange} options={["Traditional","Moderate","Liberal"]} />
          <SelectField label="Living Preference" name="lookingFor.living_preference" value={formData.lookingFor?.living_preference ?? ""} onChange={onFormChange} options={["City","Village","Abroad"]} />
          <SelectField label="Open to Long Distance?" name="lookingFor.long_distance" value={formData.lookingFor?.long_distance ?? ""} onChange={onFormChange} options={["Yes","Usually don't prefer"]} />
          <div className="space-y-2 md:col-span-2">
          <MultiSelectPills
            label="Caste"
            options={casteOptions}
            selectedValues={getCasteArray(formData.lookingFor?.caste)}
            onChange={vals => onFormChange({ target: { name: 'lookingFor.caste', value: vals.join(', ') } } as any)}
            />
            </div>
          <div className="space-y-2 md:col-span-2">
          <MultiSelectPills
            label="Religion"
            options={religionOptions}
            selectedValues={getCasteArray(formData.lookingFor?.religion)}
            onChange={vals => onFormChange({ target: { name: 'lookingFor.religion', value: vals.join(', ') } } as any)}
          />
          </div>
          <div className="space-y-2 md:col-span-2">
          <MultiSelectPills
            label="Marital Status"
            options={maritalStatusOptions}
            selectedValues={getCasteArray(formData.lookingFor?.marital_status)}
            onChange={vals => onFormChange({ target: { name: 'lookingFor.marital_status', value: vals.join(', ') } } as any)}
            />
            </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-center gap-4">
        <button type="submit" disabled={uploadingPhoto} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-full hover:from-pink-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 text-lg font-semibold shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
          <Check className="h-5 w-5" />
          {uploadingPhoto ? "Saving..." : showOnlyLookingFor ? "Save Preferences" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// --- Reusable Inputs ---
function InputField({ label, name, value, onChange, type = "text", placeholder }: any) { 
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50 focus:bg-white"/>
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }: any) { 
  const safeValue = Array.isArray(value) || typeof value === 'object' ? '' : (value ?? '');
  
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <select name={name} value={safeValue} onChange={onChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50 focus:bg-white">
        <option value="">Select {label}</option>
        {options.map((opt:string)=><option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, placeholder }: any) { 
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <textarea name={name} value={value} onChange={onChange} rows={4} placeholder={placeholder} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50 focus:bg-white resize-none"/>
    </div>
  );
}

function MultiSelectPills({
  label,
  options,
  selectedValues,
  onChange,
}: {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (newValues: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
        {options.map(option => {
          const isChecked = selectedValues.includes(option);
          return (
            <label
              key={option}
              className={`cursor-pointer rounded-lg px-4 py-2 border transition ${
                isChecked
                  ? "bg-green-700 text-white border-green-700"
                  : "border-gray-300 text-gray-700 hover:bg-green-100"
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={isChecked}
                onChange={() => {
                  let newValues = [...selectedValues];
                  if (isChecked) newValues = newValues.filter(v => v !== option);
                  else newValues.push(option);
                  onChange(newValues);
                }}
              />
              {option}
            </label>
          );
        })}
      </div>
    </div>
  );
}
