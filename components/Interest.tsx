"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, User, Star, Home } from "lucide-react";
import { Progress } from "./ui/progress";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const defaultForm = {
  partner_age: "",
  partner_gender: "",
  partner_height: "",
  partner_marital_status: "",
  partner_religion: "",
  partner_caste: "",
  partner_personality: "",
  partner_hobbies: [] as string[],
  partner_pets: "",
  partner_education: "",
  partner_profession: "",
  partner_family_type: "",
  partner_family_values: "",
  partner_living_pref: "",
  partner_long_distance: "",
};

export default function Interests() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(defaultForm);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pairupUser");
    if (stored) setUser(JSON.parse(stored));
    else router.push("/login");
  }, [router]);

  const toggleMultiSelect = (
    field: keyof typeof defaultForm,
    value: string
  ) => {
    const selected = formData[field] as string[];
    const updated = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    setFormData({ ...formData, [field]: updated });
  };

  const requiredFieldsPerStep: { [key: number]: (keyof typeof defaultForm)[] } =
    {
      0: [
        "partner_age",
        "partner_gender",
        "partner_height",
        "partner_marital_status",
      ],
      1: [
        "partner_religion",
        "partner_personality",
        "partner_hobbies",
        "partner_pets",
      ],
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
    if (!user?.email) return toast.error("User not authenticated.");

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5050/api/user/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, ...formData }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        localStorage.setItem(
          "pairupUser",
          JSON.stringify({ ...user, interests_completed: true })
        );
        toast.success("Preferences saved!");
        setMessage("Saved! Redirecting...");
        setTimeout(() => router.push("/user_dashboard"), 1200);
      } else {
        toast.error(result.message || "Failed to save.");
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "Your Basic Preferences",
      description: "",
      icon: <User className="h-10 w-10 text-pink-500 mx-auto mb-4" />,
      fields: (
        <>
          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_age}
            onChange={(e) =>
              setFormData({ ...formData, partner_age: e.target.value })
            }
          >
            <option value="">Preferred Age Group</option>
            <option>18-24</option>
            <option>25-30</option>
            <option>31-35</option>
            <option>36-40</option>
            <option>41-45</option>
            <option>46+</option>
          </select>

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
            {/* <option>Other</option> */}
            <option>Any</option>
          </select>

          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_height}
            onChange={(e) =>
              setFormData({ ...formData, partner_height: e.target.value })
            }
          >
            <option value="">Preferred Height</option>
            <option value="Below 5'0&quot;">Below 5'0"</option>
            <option value="5'0&quot; - 5'2&quot;">5'0" - 5'2"</option>
            <option value="5'3&quot; - 5'5&quot;">5'3" - 5'5"</option>
            <option value="5'6&quot; - 5'8&quot;">5'6" - 5'8"</option>
            <option value="5'9&quot; - 5'11&quot;">5'9" - 5'11"</option>
            <option value="Above 5'11&quot;">Above 5'11"</option>
            <option value="Any">Any</option>
          </select>

          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_marital_status}
            onChange={(e) =>
              setFormData({
                ...formData,
                partner_marital_status: e.target.value,
              })
            }
          >
            <option value="">Marital Status</option>
            <option>Single</option>
            <option>Divorced</option>
            <option>Widowed</option>
            <option>Any</option>
          </select>
        </>
      ),
    },
    {
      title: "Personality & Interests",
      // description: 'Family & Lifestyle Preferences',
      icon: <Star className="h-12 w-12 text-pink-500 mx-auto mb-4" />,
      fields: (
        <>
          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_religion}
            onChange={(e) =>
              setFormData({ ...formData, partner_religion: e.target.value })
            }
          >
            <option value="">Prefered Religion</option>
            <option value="Hindu">Hindu</option>
                <option value="Muslim">Muslim</option>
                <option value="Christian">Christian</option>
                <option value="Sikh">Sikh</option>
                <option value="Buddhist">Buddhist</option>
                <option value="Jain">Jain</option>
                <option value="Other">Other</option>
            <option value="Any">Any</option>
          </select>
          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_caste}
            onChange={(e) =>
              setFormData({ ...formData, partner_caste: e.target.value })
            }
          >
            <option value="">Prefered Caste</option>
            <option value="Brahmin">Brahmin</option>
                <option value="Chhetri">Chhetri</option>
                <option value="Thakuri">Thakuri</option>
                <option value="Newar">Newar</option>
                <option value="Tamang">Tamang</option>
                <option value="Magar">Magar</option>
                <option value="Rai">Rai</option>
                <option value="Limbu">Limbu</option>
                <option value="Sherpa">Sherpa</option>
                <option value="Gurung">Gurung</option>
                <option value="Tharu">Tharu</option>
                <option value="Madhesi">Madhesi</option>
                <option value="Muslim">Muslim</option>
                <option value="Dalit">Dalit</option>
                <option value="Other">Other</option>
            <option value="Any">Any</option>
          </select>

          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_pets}
            onChange={(e) =>
              setFormData({ ...formData, partner_pets: e.target.value })
            }
          >
            <option value="">Pets Preference</option>
            <option>Love Them</option>
            <option>Neutral</option>
            <option>Can't Live With</option>
          </select>
          <select
            className="w-full mb-3 p-3 border border-gray-400 rounded-xl text-gray-600"
            value={formData.partner_personality}
            onChange={(e) =>
              setFormData({ ...formData, partner_personality: e.target.value })
            }
          >
            <option value="">Prefered personality</option>
            <option value="Homebody">Homebody</option>
            <option value="Social Butterfly">Social Butterfly</option>
            <option value="Balanced">Balanced</option>
            <option value="Any">Any</option>
          </select>
          <p className="font-semibold mt-4 mb-1">Hobbies:</p>
          {[
            "Traveling",
            "Cooking",
            "Reading",
            "Music",
            "Fitness",
            "Pets",
            "Movies",
            "Art",
            "Photography",
            "Gardening",
            "Volunteering",
            "Technology",
            "Writing",
            "Dancing",
            "Spirituality",
            "Gaming",
            "Adventure Sports",
            "Fashion",
            "Blogging",
            "Languages",
          ].map((hobby) => (
            <label key={hobby} className="block mb-1">
              <input
                type="checkbox"
                checked={formData.partner_hobbies.includes(hobby)}
                onChange={() => toggleMultiSelect("partner_hobbies", hobby)}
              />{" "}
              {hobby}
            </label>
          ))}
        </>
      ),
    },
    {
      title: "Family & Lifestyle Preferences",
      // description: 'Family & Lifestyle Preferences',
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
            <option>Any</option>
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
            <option>Any</option>
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
            <option>Any</option>
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
            <option>Maybe</option>
            <option>No</option>
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
        <h4 className="text-sm p-2 font-bold text-gray-500 mb-10 text-center">
          {steps[step].description}
        </h4>

        <div className="space-y-4">{steps[step].fields}</div>

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
