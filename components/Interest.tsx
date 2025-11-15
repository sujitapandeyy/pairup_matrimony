"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { Heart, User, Star, Home } from "lucide-react";
import { Progress } from "./ui/progress";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { interestForm } from "@/types/allTypes";

const casteOptions = ["Brahmin","Chhetri","Thakuri","Newar","Tamang","Magar","Rai","Limbu","Sherpa","Gurung","Dalit","Tharu","Madhesi","Muslim",];
const religionOptions = ["Hindu","Muslim","Christian","Sikh","Buddhist","Jain"];
const maritalStatusOptions = ["Single", "Divorced", "Widowed"];

export default function Interests() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(interestForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Monitor session for errors
  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      toast.error('Your session has expired. Please log in again.');
      signOut({ redirect: true, callbackUrl: '/login' });
    }
  }, [session]);

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("Please log in to continue");
      router.push("/login");
    }
  }, [status, router]);

  const requiredFieldsPerStep: {
    [key: number]: (keyof typeof interestForm)[];
  } = {
    0: [
      "partner_age",
      "partner_gender",
      "partner_height",
      "partner_marital_status",
    ],
    1: ["partner_religion", "partner_personality", "partner_pets"],
    2: [
      "partner_education",
      "partner_profession",
      "partner_family_type",
      "partner_family_values",
      "partner_living_pref",
      "partner_long_distance",
    ],
  };

  const validateStep = () => {
    const requiredFields = requiredFieldsPerStep[step];
    const missing = requiredFields.filter((field) => {
      const value = formData[field];
      if (Array.isArray(value)) return value.length === 0;
      return !value;
    });

    if (missing.length > 0) {
      toast.error("Please fill all required fields before proceeding.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    if (!session?.user?.email) {
      toast.error("User not authenticated.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Use the configured API client instead of fetch
      const res = await api.post("/api/user/interests", {
        email: session.user.email,
        ...formData,
      });

      if (res.data.success) {
        toast.success("Preferences saved!");
        setMessage("Saved! Redirecting...");
        
        // Update the session to reflect interests_completed
        await update({
          interests_completed: true,
        });
        
        setTimeout(() => router.push("/user_dashboard"), 1200);
      } else {
        toast.error(res.data.message || "Failed to save preferences.");
        setError(res.data.message || "Failed to save preferences.");
      }
    } catch (err: any) {
      console.error("Error saving interests:", err);
      
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        signOut({ redirect: true, callbackUrl: '/login' });
      } else {
        const errorMsg = err.response?.data?.message || "Server error. Please try again.";
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show not authenticated
  if (status === "unauthenticated") {
    return null; // Will redirect in useEffect
  }

  const steps = [
    {
      title: "Your Basic Preferences",
      icon: <User className="h-10 w-10 text-pink-500 mx-auto mb-4" />,
      fields: (
        <>
          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_gender}
            onChange={(e) =>
              setFormData({ ...formData, partner_gender: e.target.value })
            }
          >
            <option value="">Preferred Gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Any</option>
          </select>

          {/* Height Range */}
          <div className="flex gap-3">
            <select
              className="w-1/2 p-3 border border-gray-400 rounded-xl text-gray-600"
              value={formData.partner_height_from}
              onChange={(e) => {
                const from = e.target.value;
                const to = formData.partner_height_to;
                setFormData({
                  ...formData,
                  partner_height_from: from,
                  partner_height: from && to ? `${from} - ${to}` : from || "",
                });
              }}
            >
              <option value="">Height From</option>
              {Array.from({ length: 12 }, (_, i) => 5 + i / 12).map((_, i) => (
                <option key={i} value={`5'${i}"`}>{`5'${i}"`}</option>
              ))}
            </select>

            <select
              className="w-1/2 p-3 border border-gray-400 rounded-xl text-gray-600"
              value={formData.partner_height_to}
              onChange={(e) => {
                const to = e.target.value;
                const from = formData.partner_height_from;
                setFormData({
                  ...formData,
                  partner_height_to: to,
                  partner_height: from && to ? `${from} - ${to}` : from || to,
                });
              }}
            >
              <option value="">Height To</option>
              {Array.from({ length: 12 }, (_, i) => 5 + i / 12).map((_, i) => (
                <option key={i} value={`5'${i}"`}>{`5'${i}"`}</option>
              ))}
            </select>
          </div>

          {/* Age Range */}
          <div className="flex gap-3">
            <select
              className="w-1/2 p-3 border border-gray-400 rounded-xl text-gray-600"
              value={formData.partner_age_from}
              onChange={(e) => {
                const from = e.target.value;
                const to = formData.partner_age_to;
                setFormData({
                  ...formData,
                  partner_age_from: from,
                  partner_age: from && to ? `${from}-${to}` : "",
                });
              }}
            >
              <option value="">Age From</option>
              {Array.from({ length: 29 }, (_, i) => 18 + i).map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>

            <select
              className="w-1/2 p-3 border border-gray-400 rounded-xl text-gray-600"
              value={formData.partner_age_to}
              onChange={(e) => {
                const to = e.target.value;
                const from = formData.partner_age_from;
                setFormData({
                  ...formData,
                  partner_age_to: to,
                  partner_age: from && to ? `${from}-${to}` : "",
                });
              }}
            >
              <option value="">Age To</option>
              {Array.from({ length: 29 }, (_, i) => 18 + i).map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
            
          </div>
          {/* Marital Status Multi-select */}
          <div className="w-full mb-3 p-4 border border-gray-400 rounded-xl text-gray-700">
            <label className="block font-semibold mb-2">
             Marital Status
            </label>
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">

              {maritalStatusOptions.map((status) => (
                <label
                  key={status}
                  className={`cursor-pointer rounded-lg px-4 py-2 border ${
                    formData.partner_marital_status.includes(status)
                      ? "bg-green-700 text-white border-green-700"
                      : "border-gray-300 text-gray-700 hover:bg-green-100"
                  } transition`}
                >
                  <input
                    type="checkbox"
                    value={status}
                    checked={formData.partner_marital_status.includes(status)}
                    onChange={() => {
                      const selected = formData.partner_marital_status.includes(
                        status
                      )
                        ? formData.partner_marital_status.filter(
                            (s) => s !== status
                          )
                        : [...formData.partner_marital_status, status];
                      setFormData({
                        ...formData,
                        partner_marital_status: selected,
                      });
                    }}
                    className="hidden"
                  />
                  {status}
                </label>
              ))}
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Personality & Interests",
      icon: <Star className="h-12 w-12 text-pink-500 mx-auto mb-4" />,
      fields: (
        <>
          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_pets}
            onChange={(e) =>
              setFormData({ ...formData, partner_pets: e.target.value })
            }
          >
            <option value="">Pets Preference</option>
            <option>Love Them</option>
            <option>Usually don't prefer</option>
          </select>

          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_personality}
            onChange={(e) =>
              setFormData({ ...formData, partner_personality: e.target.value })
            }
          >
            <option value="">Preferred Personality</option>
            <option value="Homebody">Homebody</option>
            <option value="Social Butterfly">Social Butterfly</option>
            <option value="Balanced">Balanced</option>
          </select>

          {/* Religion Multi-select */}
          <div className="w-full mb-3 p-4 border border-gray-400 rounded-xl text-gray-700">
            <label className="block font-semibold mb-2">
              Preferred Religions
            </label>
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
              <label
                className={`cursor-pointer rounded-lg px-4 py-2 border ${
                  formData.partner_religion.length === religionOptions.length
                    ? "bg-green-700 text-white border-green-700"
                    : "border-gray-300 text-gray-700 hover:bg-green-100"
                } transition`}
              >
                <input
                  type="checkbox"
                  checked={
                    formData.partner_religion.length === religionOptions.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        partner_religion: religionOptions,
                      });
                    } else {
                      setFormData({ ...formData, partner_religion: [] });
                    }
                  }}
                  className="hidden"
                />
                Select All
              </label>

              {religionOptions.map((religion) => (
                <label
                  key={religion}
                  className={`cursor-pointer rounded-lg px-4 py-2 border ${
                    formData.partner_religion.includes(religion)
                      ? "bg-green-700 text-white border-green-700"
                      : "border-gray-300 text-gray-700 hover:bg-green-100"
                  } transition`}
                >
                  <input
                    type="checkbox"
                    value={religion}
                    checked={formData.partner_religion.includes(religion)}
                    onChange={() => {
                      const selected = formData.partner_religion.includes(
                        religion
                      )
                        ? formData.partner_religion.filter(
                            (r) => r !== religion
                          )
                        : [...formData.partner_religion, religion];
                      setFormData({ ...formData, partner_religion: selected });
                    }}
                    className="hidden"
                  />
                  {religion}
                </label>
              ))}
            </div>
          </div>

          {/* Caste Multi-select */}
          <div className="w-full mb-3 p-4 border border-gray-400 rounded-xl text-gray-700">
            <label className="block font-semibold mb-2">Preferred Castes</label>
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
              <label
                className={`cursor-pointer rounded-lg px-4 py-2 border ${
                  formData.partner_caste.length === casteOptions.length
                    ? "bg-green-700 text-white border-green-700"
                    : "border-gray-300 text-gray-700 hover:bg-green-100"
                } transition`}
              >
                <input
                  type="checkbox"
                  checked={
                    formData.partner_caste.length === casteOptions.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, partner_caste: casteOptions });
                    } else {
                      setFormData({ ...formData, partner_caste: [] });
                    }
                  }}
                  className="hidden"
                />
                Select All
              </label>

              {casteOptions.map((caste) => (
                <label
                  key={caste}
                  className={`cursor-pointer rounded-lg px-4 py-2 border ${
                    formData.partner_caste.includes(caste)
                      ? "bg-green-700 text-white border-green-700"
                      : "border-gray-300 text-gray-700 hover:bg-green-100"
                  } transition`}
                >
                  <input
                    type="checkbox"
                    value={caste}
                    checked={formData.partner_caste.includes(caste)}
                    onChange={() => {
                      const selected = formData.partner_caste.includes(caste)
                        ? formData.partner_caste.filter((c) => c !== caste)
                        : [...formData.partner_caste, caste];
                      setFormData({ ...formData, partner_caste: selected });
                    }}
                    className="hidden"
                  />
                  {caste}
                </label>
              ))}
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Family & Lifestyle Preferences",
      icon: <Home className="h-10 w-10 text-pink-500 mx-auto mb-4" />,
      fields: (
        <>
          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_education}
            onChange={(e) =>
              setFormData({ ...formData, partner_education: e.target.value })
            }
          >
            <option value="">Education</option>
            <option value="High School">High School</option>
            <option value="Diploma">Diploma</option>
            <option value="Bachelor's">Bachelor's</option>
            <option value="Master's">Master's</option>
            <option value="PhD">PhD</option>
          </select>

          <input
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            placeholder="Profession (e.g. Software Engineer)"
            value={formData.partner_profession}
            onChange={(e) =>
              setFormData({ ...formData, partner_profession: e.target.value })
            }
          />

          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_family_type}
            onChange={(e) =>
              setFormData({ ...formData, partner_family_type: e.target.value })
            }
          >
            <option value="">Family Type</option>
            <option>Joint</option>
            <option>Nuclear</option>
          </select>

          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_family_values}
            onChange={(e) =>
              setFormData({
                ...formData,
                partner_family_values: e.target.value,
              })
            }
          >
            <option value="">Family Values</option>
            <option>Traditional</option>
            <option>Moderate</option>
            <option>Liberal</option>
          </select>

          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_living_pref}
            onChange={(e) =>
              setFormData({ ...formData, partner_living_pref: e.target.value })
            }
          >
            <option value="">Living Preference</option>
            <option>City</option>
            <option>Village</option>
            <option>Abroad</option>
          </select>

          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_long_distance}
            onChange={(e) =>
              setFormData({
                ...formData,
                partner_long_distance: e.target.value,
              })
            }
          >
            <option value="">Open to Long Distance?</option>
            <option>Yes</option>
            <option>Usually don't prefer</option>
          </select>
        </>
      ),
    },
  ];

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 py-8 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-serif font-bold text-pink-00 mb-4 text-center flex items-center justify-center gap-2">
          <span className="w-10 h-10 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </span>
          Pair-Up
        </h1>

        <Progress value={progress} className="w-full m-4 h-4" />
        <p className="text-center text-gray-500 mt-2 mb-6">
          Step {step + 1} of {steps.length}
        </p>

        {steps[step].icon}
        <h2 className="text-3xl font-bold text-gray-600 text-center">
          {steps[step].title}
        </h2>

        <div className="space-y-4 mt-6">{steps[step].fields}</div>

        {error && <p className="text-red-600 mt-3 text-center">{error}</p>}
        {message && (
          <p className="text-green-600 mt-3 text-center">{message}</p>
        )}

        <div className="flex gap-4 mt-6">
          {step > 0 && (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              className="w-full"
              onClick={() => {
                if (validateStep()) setStep(step + 1);
              }}
            >
              Next
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit & Finish"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}