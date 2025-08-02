'use client';

import React from "react";
import { MapPin, Heart, Edit3, Mail, Calendar, Briefcase, GraduationCap, Users, Home, Church, Hand, Baby } from "lucide-react";
import { Profile } from "./types";

interface ProfileViewProps {
  profile: Profile;
  onEditClick: () => void;
}

export default function ProfileView({ profile, onEditClick }: ProfileViewProps) {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-pink-500" />
          Personal Details
        </h3>
        <div className="space-y-4">
          <DetailItem icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email} />
          {/* <DetailItem icon={<Calendar className="h-4 w-4" />} label="Age" value={profile.age ?? "N/A"} /> */}
          <DetailItem icon={<Users className="h-4 w-4" />} label="Gender" value={profile.gender ?? "N/A"} />
          <DetailItem icon={<Baby className="h-4 w-4" />} label="Height" value={profile.height ?? "N/A"} />
          <DetailItem icon={<Hand className="h-4 w-4" />} label="Personality " value={profile.personality ?? "N/A"} />
          <DetailItem icon={<Heart className="h-4 w-4" />} label="Marital Status" value={profile.maritalStatus ?? "N/A"} />
          <DetailItem icon={<Home className="h-4 w-4" />} label="Religion" value={profile.religion ?? "N/A"} />
          <DetailItem icon={<Church className="h-4 w-4" />} label="Caste " value={profile.caste ?? "N/A"} />
          {/* <DetailItem icon={<MapPin className="h-4 w-4" />} label="Location" value={profile.location ?? "N/A"} /> */}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-purple-500" />
          Professional Details
        </h3>
        <div className="space-y-4">
          <DetailItem icon={<GraduationCap className="h-4 w-4" />} label="Education" value={profile.education ?? "N/A"} />
          <DetailItem icon={<Briefcase className="h-4 w-4" />} label="Profession" value={profile.profession ?? "N/A"} />
        </div>
        
        {profile.interest && profile.interest.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-gray-800 mb-3">Interest Traits</h4>
            <div className="flex flex-wrap gap-2">
              {profile.interest.map((trait, index) => (
                <span key={index} className="bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Partner Preferences Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500" />
          Looking For
        </h3>
        {profile.lookingFor && Object.keys(profile.lookingFor).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(profile.lookingFor).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <span className="font-medium text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span className="text-gray-800 font-medium">
                  {Array.isArray(value) ? value.join(", ") : value?.toString() || "N/A"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No preferences specified</p>
        )}
      </div>
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