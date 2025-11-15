"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { signIn, getSession } from "next-auth/react";
import { TokenManager } from "@/lib/tokenManager";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      console.log("SignIn result:", result);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (result?.ok) {
        // Wait for session to be set
        await new Promise((resolve) => setTimeout(resolve, 100));

        const session = await getSession();

        if (session?.accessToken) {
          TokenManager.setTokens(session.accessToken, session.refreshToken);
          toast.success("Login successful!");

          // Redirect based on role and interests completion
          if (session.user.role === "admin") {
            router.push("/admin/dashboard");
          } else if (!session.user.interests_completed) {
            router.push("/interests");
          } else {
            router.push("/user_dashboard");
          }

          router.refresh();
        } else {
          toast.error("Login successful but token not received");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Cannot connect to server. Please check if the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12"
      // style={{
      //   backgroundImage: `url("img/bg1.jpg")`,
      //   backgroundRepeat: "no-repeat",
      //   backgroundSize: "cover",
      //   backgroundPosition: "center",
      // }}
    >
      <div className="bg-white shadow-xl rounded-xl max-w-md w-full p-8">
        <h1 className="text-3xl font-serif font-bold text-pink-600 mb-4 text-center flex items-center justify-center gap-2">
          Welcome Back
        </h1>
        <p className="text-center text-pink-600 mb-8 font-medium">
          Login to your PairUp account
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-gray-700 font-semibold mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-gray-700 font-semibold mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-700 hover:bg-orange-800 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-orange-700 font-semibold hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}