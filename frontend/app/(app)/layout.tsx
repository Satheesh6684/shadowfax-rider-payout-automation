"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { AppShell } from "@/components/layout/AppShell";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background" />;
  }

  return <AppShell>{children}</AppShell>;
}
