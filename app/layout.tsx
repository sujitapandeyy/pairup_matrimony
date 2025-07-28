"use client";

import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { usePathname } from "next/navigation";
import "./globals.css";
import { Toaster } from "sonner";
import NavBar from "@/components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide navbar on /login and /register
  const hideNavBar = ["/login", "/register", '/interest', '/','/interests'].includes(pathname);
  // const hideNavBar = [""].includes(pathname);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {!hideNavBar && <NavBar />}
        {children}
        <Toaster richColors position="bottom-right" duration={2000} />
      </body>
    </html>
  );
}
