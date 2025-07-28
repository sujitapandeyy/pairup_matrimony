'use client';

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, UserPlus, ChevronDown } from "lucide-react";
import { useRouter } from 'next/navigation';

interface AuthDropdownProps {
  onRegister?: () => void;
  onLogin?: () => void;
}

export const AuthDropdown = ({ onRegister, onLogin }: AuthDropdownProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogin = () => {
    setIsOpen(false);
    onLogin?.();
    router.push("/login");
  };

  const handleRegister = () => {
    setIsOpen(false);
    onRegister?.();
    router.push("/register");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        className="bg-transparent hover:bg-white text-pink-600 px-6 py-2 text-md font-bold transition-all duration-300 flex items-center gap-2"
        onClick={() => setIsOpen(prev => !prev)}
      >
        Get Started
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>

      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 w-48 shadow-xl border-0 bg-white/95 backdrop-blur-sm z-50">
          <CardContent className="p-2">
            <Button
              onClick={handleLogin}
              variant="ghost"
              className="w-full justify-start text-left hover:bg-pink-100 hover:text-pink-600 transition duration-200 mb-1"
            >
              <LogIn className="h-4 w-4 mr-3" />
              Login
            </Button>
            <Button
              onClick={handleRegister}
              variant="ghost"
              className="w-full justify-start text-left hover:bg-pink-100 hover:text-pink-600 transition duration-200"
            >
              <UserPlus className="h-4 w-4 mr-3" />
              Register
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
