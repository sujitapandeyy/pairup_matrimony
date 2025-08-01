"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Heart } from "lucide-react";

const LocationInput = dynamic(() => import("@/components/LocationInput"), {
  ssr: false,
});
export default function Registration() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [detailsData, setDetailsData] = useState({
    age: "",
    gender: "",
    religion: "",
    caste: "",
    location: "",
    latitude: "",
    longitude: "",
    height: "",
    maritalStatus: "",
    education: "",
    profession: "",
    personality: "",
    hobbies: [] as string[],
    caption: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("pairupUser");
    if (storedUser) router.push("/user_dashboard");
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocationSelect = (loc: {
    display_name: string;
    lat: string;
    lon: string;
  }) => {
    setDetailsData({
      ...detailsData,
      location: loc.display_name,
      latitude: loc.lat,
      longitude: loc.lon,
    });
  };

  const handleDetailsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") return;
    setDetailsData({ ...detailsData, [name]: value });
  };

  const toggleCheckbox = (item: string) => {
    const updated = detailsData.hobbies.includes(item)
      ? detailsData.hobbies.filter((i) => i !== item)
      : [...detailsData.hobbies, item];
    setDetailsData({ ...detailsData, hobbies: updated });
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill out all fields");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      age,
      gender,
      religion,
      location,
      maritalStatus,
      education,
      profession,
      personality,
      hobbies,
      caption,
      latitude,
      longitude,
    } = detailsData;

    if (
      !age ||
      !gender ||
      !religion ||
      !location ||
      !maritalStatus ||
      !education ||
      !profession ||
      !personality ||
      hobbies.length === 0
    ) {
      return toast.error("Fill all required fields");
    }

    if (parseInt(age) < 18) {
      return toast.error("Age must be 18+");
    }
    if (!latitude || !longitude) {
      return toast.error(
        "Invalid location details. Please provide valid location."
      );
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5050/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          details: detailsData,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Registration successful!");
        localStorage.setItem(
          "pairupUser",
          JSON.stringify({
            name: formData.name,
            email: formData.email,
          })
        );
        router.push("/login");
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  const hobbiesList = [
    "Traveling",
    "Cooking",
    "Art",
    "Music",
    "Fitness",
    "Gaming",
    "Movies",
    "Adventure Sports",
    "Dancing",
    "Reading",
    "Photography",
    "Gardening",
    "Volunteering",
    "Technology",
    "Writing",
    "Pets",
    "Fashion",
    "Spirituality",
    "Blogging",
    "Languages",
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12" 
    // style={{ backgroundImage: `url("img/bg2.jpg")`,     backgroundRepeat: "no-repeat",backgroundSize: "cover",backgroundPosition: "center" }}
    >
      <div className="bg-white shadow-xl rounded-xl max-w-md w-full p-8 ">
       <div className="text-center mb-6">
  <h1 className="text-3xl font-serif font-bold text-gray-800">
    PairUp Matrimony
  </h1>
  {/* <div className="w-10 h-10 mx-auto m-2 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
    <Heart className="w-6 h-6 text-white" />
  </div> */}
</div>

        {step === 1 && (
          <>
            <p className="text-center text-pink-500 mb-8 font-bold">
              Register here and find your perfect match
            </p>
            <form onSubmit={handleNext} className="space-y-6">
              <input
                name="name"
                placeholder="Enter your Full Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Enter your Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Enter your Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              />

              {loading && (
                <p className="text-center mt-3 text-gray-600 font-semibold">
                  Processing...
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg mt-6 transition"
              >
                Next
              </button>

              <p className="mt-4 text-center text-gray-600">
                Already registered?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-green-700 hover:text-green-900"
                >
                  Login here
                </Link>
              </p>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-center text-gray-600 mb-8 font-medium">
              Provide your personal details
            </p>

            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <select
                name="age"
                value={detailsData.age}
                onChange={handleDetailsChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              >
                <option value="">Select Age</option>
                {[...Array(40)].map((_, i) => {
                  const age = i + 18;
                  return (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  );
                })}
              </select>

              <select
                name="gender"
                value={detailsData.gender}
                onChange={handleDetailsChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                {/* <option value="Other">Other</option> */}
              </select>
              <select
                name="personality"
                value={detailsData.personality}
                onChange={handleDetailsChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              >
                <option value="">Select Personality</option>
            <option value="Homebody">Homebody</option>
            <option value="Social Butterfly">Social Butterfly</option>
            <option value="Balanced">Balanced</option>
              </select>

              <select
                name="religion"
                value={detailsData.religion}
                onChange={handleDetailsChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              >
                <option value="">Select Religion</option>
                <option value="Hindu">Hindu</option>
                <option value="Muslim">Muslim</option>
                <option value="Christian">Christian</option>
                <option value="Sikh">Sikh</option>
                <option value="Buddhist">Buddhist</option>
                <option value="Jain">Jain</option>
                <option value="Other">Other</option>
              </select>
              <select
                name="caste"
                value={detailsData.caste}
                onChange={handleDetailsChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              >
                <option value="">Select caste</option>
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
              </select>

              <select
                name="height"
                value={detailsData.height}
                onChange={handleDetailsChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              >
                <option value="">Select Height</option>
                <option value="4'10&quot;">4'10" (147 cm)</option>
                <option value="4'11&quot;">4'11" (150 cm)</option>
                <option value="5'0&quot;">5'0" (152 cm)</option>
                <option value="5'1&quot;">5'1" (155 cm)</option>
                <option value="5'2&quot;">5'2" (157 cm)</option>
                <option value="5'3&quot;">5'3" (160 cm)</option>
                <option value="5'4&quot;">5'4" (163 cm)</option>
                <option value="5'5&quot;">5'5" (165 cm)</option>
                <option value="5'6&quot;">5'6" (168 cm)</option>
                <option value="5'7&quot;">5'7" (170 cm)</option>
                <option value="5'8&quot;">5'8" (173 cm)</option>
                <option value="5'9&quot;">5'10" (175 cm)</option>
                <option value="5'10&quot;">5'11" (178 cm)</option>
                <option value="5'10&quot;">6'0" (180 cm)</option>
                <option value="5'10&quot;">6'1" (185 cm)</option>
                <option value="5'10&quot;">6'2" (188 cm)</option>
              </select>

              <select
                name="maritalStatus"
                value={detailsData.maritalStatus}
                onChange={handleDetailsChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              >
                <option value="">Select Marital Status</option>
                <option value="Single">Single</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>

              <select
                name="education"
                value={detailsData.education}
                onChange={handleDetailsChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              >
                <option value="">select your Education</option>
                <option value="High School">High School</option>
                <option value="Diploma">Diploma</option>
                <option value="Bachelor's">Bachelor's</option>
                <option value="Master's">Master's</option>
                <option value="PhD">PhD</option>
              </select>
        
              <input
                type="text"
                name="profession"
                placeholder="Enter your Profession"
                value={detailsData.profession}
                onChange={handleDetailsChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                required
              />
              <LocationInput
                value={detailsData.location}
                onSelect={handleLocationSelect}
              />
              <div>
                <p className="mb-2 font-semibold">Select your hobbies:</p>
                <div className="flex flex-wrap gap-2">
                  {hobbiesList.map((item) => (
                    <label
                      key={item}
                      className={`cursor-pointer rounded-lg px-4 py-2 border ${
                        detailsData.hobbies.includes(item)
                          ? "bg-green-700 text-white border-green-700"
                          : "border-gray-300 text-gray-700 hover:bg-green-100"
                      } transition`}
                    >
                      <input
                        type="checkbox"
                        name="hobbies"
                        value={item}
                        checked={detailsData.hobbies.includes(item)}
                        onChange={() => toggleCheckbox(item)}
                        className="hidden"
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <input
                type="text"
                name="caption"
                placeholder="Write a short caption about yourself"
                value={detailsData.caption}
                onChange={(e) =>
                  setDetailsData({ ...detailsData, caption: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
                maxLength={100}
              />

              {loading && (
                <p className="text-center mt-3 text-gray-600 font-semibold">
                  Processing...
                </p>
              )}

              <div className="flex justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="w-1/2 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-3 rounded-lg transition"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 bg-green-700 hover:bg-green-900 text-white font-bold py-3 rounded-lg transition"
                >
                  Register
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
