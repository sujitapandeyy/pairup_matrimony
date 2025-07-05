"use client";

import React, { useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'
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
  const [currentView, setCurrentView] = useState<'discover' | 'matches' | 'chat' | 'profile'>('discover');

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* <NavBar currentView={currentView} setCurrentView={setCurrentView} /> */}
        {children}
              <Toaster richColors position="bottom-right" duration={2000}/>

      </body>
    </html>
  );
}
