// components/AuthProvider.tsx
"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { TokenManager } from "@/lib/tokenManager";

function TokenSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.accessToken) {
      // Sync tokens to localStorage whenever session changes
      TokenManager.setTokens(
        session.accessToken,
        session.refreshToken
      );
    }
  }, [session]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TokenSync />
      {children}
    </SessionProvider>
  );
}