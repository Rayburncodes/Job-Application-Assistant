"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { UserProfileProvider, useUserProfile } from "@/contexts/user-profile-context";

function OnboardingGate() {
  const { profile, status } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!profile) {
      router.replace("/");
    }
  }, [profile, status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">
        Loading…
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return <OnboardingFlow />;
}

export default function OnboardingPage() {
  return (
    <UserProfileProvider>
      <div className="min-h-screen bg-[#f4f6f8] text-slate-900">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 text-sm font-black text-white">
              J
            </div>
            <span className="text-sm font-bold text-slate-900">Job Assistant</span>
          </div>
        </header>
        <OnboardingGate />
      </div>
    </UserProfileProvider>
  );
}
