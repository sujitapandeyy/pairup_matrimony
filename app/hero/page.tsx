"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Users,
  MessageCircle,
  Shield,
  Star,
  ArrowRight,
  UserPlus,
  Search,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Github,
  Linkedin,
} from "lucide-react";
import { AuthDropdown } from "@/components/AuthDropdown";
import { useRouter, usePathname } from 'next/navigation';

// Placeholder Register Component
const RegisterComponent = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-pink-50 text-center">
    <div>
      <h2 className="text-3xl font-bold mb-4">Register</h2>
      <p className="mb-6">Registration form goes here...</p>
      <Button onClick={onBack}>Back</Button>
    </div>
  </div>
);

// Placeholder Login Component
const LoginComponent = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-purple-50 text-center">
    <div>
      <h2 className="text-3xl font-bold mb-4">Login</h2>
      <p className="mb-6">Login form goes here...</p>
      <Button onClick={onBack}>Back</Button>
    </div>
  </div>
);

// Feature items
const features = [
  {
    icon: Heart,
    title: "Smart Matching",
    description:
      "We use advanced algorithms to connect you with highly compatible matches based on your preferences.",
  },
  {
    icon: Shield,
    title: "Safe & Secure",
    description:
      "Every profile is verified and protected, ensuring your safety while searching for your soulmate.",
  },
  {
    icon: MessageCircle,
    title: "Instant Chat",
    description:
      "Chat in real-time with your matches on our secure, private platform.",
  },
  {
    icon: Users,
    title: "Vibrant Community",
    description:
      "Join a large, diverse, and active community looking for serious relationships.",
  },
];

const stats = [
  { number: "50K+", label: "Active Members" },
  { number: "12K+", label: "Success Stories" },
  { number: "98%", label: "Verified Profiles" },
  { number: "4.9★", label: "User Rating" },
];

const steps = [
  {
    icon: UserPlus,
    title: "1. Create Profile",
    description:
      "Sign up and build a beautiful profile with photos and preferences.",
  },
  {
    icon: Search,
    title: "2. Browse Matches",
    description: "View compatible profiles and explore shared interests.",
  },
  {
    icon: MessageCircle,
    title: "3. Start Chatting",
    description: "Message your matches to build meaningful connections.",
  },
  {
    icon: Heart,
    title: "4. Find Love",
    description: "Take the next step toward a lasting relationship together.",
  },
];

const HeroIndex = () => {
      const router = useRouter();
    
  const [currentView, setCurrentView] = useState<
    "landing" | "register" | "swipe" | "login"
  >("landing");
  const [user, setUser] = useState(null);

  // View switching logic
  if (currentView === "register") {
    return <RegisterComponent onBack={() => setCurrentView("landing")} />;
  }

  if (currentView === "login") {
    return <LoginComponent onBack={() => setCurrentView("landing")} />;
  }
  const navigate = (page: string) => router.push(page);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 text-gray-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-rose-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              Pair-Up
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <AuthDropdown
  onRegister={() => setCurrentView("register")}
  onLogin={() => setCurrentView("login")}
/>

          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-[90vh] flex items-center justify-center bg-black overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/img/wedding-couple.png"
            alt="Happy couple"
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-left flex flex-col sm:flex-row items-center sm:items-start gap-10">
          {/* Text Block */}
          <div className="max-w-xl text-white">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Find Your <span className="text-pink-400">Forever Love</span> with pair-up
            </h1>
            <p className="text-lg text-gray-200 mb-8">
              Pair-Up connects hearts, not just profiles. Verified users,
              beautiful experiences, and deep compatibility await you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => navigate('/login')}
                className="bg-white hover:bg-pink-500 hover:text-white text-gray-800 font-bold px-5 py-3 text-lg rounded-full shadow-lg transition"
              >
                ❤️ Start Matching
              </Button>
            </div>
          </div>

          {/* Couple Illustration or Secondary Image */}
          <div className="hidden sm:block w-[350px] lg:w-[450px]">
            <img
              src="/img/couple.png"
              alt="Smiling couple"
              className="w-full h-auto object-contain drop-shadow-2xl rounded-sm"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">
            Why Choose Pair-Up?
          </h3>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-12">
            Join a vibrant and secure platform where real connections blossom.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <Card
                key={i}
                className="shadow-md hover:shadow-xl transition border-none bg-gradient-to-br from-white to-purple-50"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="text-white w-7 h-7" />
                  </div>
                  <h4 className="font-semibold text-lg mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted Stats Section */}
      <div className="m-16 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-5 gap-8 ">
        <div className="flex items-center space-x-4 justify-center">
          <img
            src="/img/verified-icon.svg"
            alt="Verified"
            className="h-10 w-10"
          />
          <div>
            <div className="font-bold text-lg">100%</div>
            <div className="text-gray-600 text-sm">
              Mobile-verified profiles
            </div>
          </div>
        </div>
        <div className="hidden sm:block border-l border-gray-300"></div>
        <div className="flex items-center space-x-4 justify-center">
          <img
            src="/img/handshake-icon.svg"
            alt="Handshake"
            className="h-10 w-10"
          />
          <div>
            <div className="font-bold text-lg">4 Crore+</div>
            <div className="text-gray-600 text-sm">Customers served</div>
          </div>
        </div>
        <div className="hidden sm:block border-l border-gray-300"></div>
        <div className="flex items-center space-x-4 justify-center">
          <img src="/img/shield-icon.svg" alt="Shield" className="h-10 w-10" />
          <div>
            <div className="font-bold text-lg">25 Years</div>
            <div className="text-gray-600 text-sm">
              of successful matchmaking
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">How It Works</h3>
          <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
            In just 4 easy steps, start your journey to love.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="text-center hover:scale-105 transition-transform"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                    <step.icon className="text-white w-8 h-8" />
                  </div>
                </div>
                <h4 className="font-semibold text-lg mb-2">{step.title}</h4>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className=" bg-pink-50 text-red-400 ">
        {/* <div className="absolute top-10 left-10 w-20 h-20 bg-primary-foreground/10 rounded-full animate-romantic-float"></div>
      <div className="absolute bottom-10 right-10 w-16 h-16 bg-primary-foreground/10 rounded-full animate-bounce-gentle"></div>
      <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-primary-foreground/20 rounded-full animate-pulse"></div> */}

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          {/* Text Content */}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-4xl font-bold mb-4">Ready to Find Love?</h3>
            <p className="text-pink-800 text-lg mb-8">
              It only takes a few minutes to meet someone special.
            </p>
            <Button
                onClick={() => navigate('/register')}
              className="bg-white text-pink-600 hover:bg-pink-50 px-8 py-3 text-lg font-semibold rounded-full shadow-md hover:shadow-xl transition"
            >
              Create Your Profile <Heart className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Image */}
          <div className="flex-1">
            <img
              src="/img/wedding-couple.png"
              alt="Wedding couple"
              className="rounded-lg shadow-lg w-full max-h-[450px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="text-red-500" size={24} />
                <span className="text-lg font-bold text-red-500 text-bold">
                  Pair-Up
                </span>
              </div>
              <p className="text-muted-foreground mb-4">
                Connecting hearts and souls to create beautiful love stories
                that last a lifetime.
              </p>
              <div className="flex gap-4">
                <Facebook className="text-black" size={24} />
                <Instagram className="text-black" size={24} />
                <Linkedin className="text-black" size={24} />
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">
                Quick Links
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Success Stories
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Safety Tips
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">
                Contact Info
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="text-primary" size={16} />
                  <span className="text-muted-foreground">
                    hello@pairup.com
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="text-primary" size={16} />
                  <span className="text-muted-foreground">
                    +977 98765432100
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="text-primary" size={16} />
                  <span className="text-muted-foreground">
                    Kathmandu, Nepal
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>
              &copy; 2024 PairUp Matrimony. All rights reserved. Made with ❤️
              for love.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HeroIndex;
