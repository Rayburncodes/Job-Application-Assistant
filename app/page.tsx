"use client";

import { AssistantShell } from "@/components/AssistantShell";
import { UserProfileProvider } from "@/contexts/user-profile-context";

export default function Home() {
  return (
    <UserProfileProvider>
      <AssistantShell />
    </UserProfileProvider>
  );
}
