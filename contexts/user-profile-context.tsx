"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UserProfile = {
  id: string;
  username: string | null;
  name: string;
  email: string;
  workHistory: unknown;
  skills: unknown;
  createdAt: string;
};

function normalizeUser(raw: Record<string, unknown>): UserProfile {
  return {
    id: String(raw.id),
    username: raw.username == null ? null : String(raw.username),
    name: String(raw.name),
    email: String(raw.email),
    workHistory: raw.workHistory,
    skills: raw.skills,
    createdAt:
      typeof raw.createdAt === "string"
        ? raw.createdAt
        : raw.createdAt instanceof Date
          ? raw.createdAt.toISOString()
          : String(raw.createdAt),
  };
}

type UserProfileContextValue = {
  profile: UserProfile | null;
  status: "idle" | "loading" | "ready" | "error";
  refreshProfile: () => Promise<void>;
  clearProfile: () => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<UserProfileContextValue["status"]>("idle");

  const refreshProfile = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data: unknown = await res.json().catch(() => null);
      const record = data as Record<string, unknown> | null;
      if (!res.ok || !record) {
        setProfile(null);
        setStatus("error");
        return;
      }
      if (record.user === null || record.user === undefined) {
        setProfile(null);
        setStatus("idle");
        return;
      }
      if (typeof record.user !== "object" || record.user === null) {
        setProfile(null);
        setStatus("idle");
        return;
      }
      setProfile(normalizeUser(record.user as Record<string, unknown>));
      setStatus("ready");
    } catch {
      setProfile(null);
      setStatus("error");
    }
  }, []);

  const clearProfile = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* still clear local state */
    }
    setProfile(null);
    setStatus("idle");
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({ profile, status, refreshProfile, clearProfile }),
    [profile, status, refreshProfile, clearProfile]
  );

  return (
    <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return ctx;
}
