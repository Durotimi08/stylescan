"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState<{
    plan: string;
    usage: { scansThisMonth: number; scansLimit: number; scansRemaining: number };
  } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await apiFetch<typeof profile>("/users/me", { token });
      setProfile(data);
    } catch {
      // ignore
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Settings</h1>
      <p className="text-sm text-[#8A8F98] mb-8">Manage your account and billing.</p>

      {/* Account info */}
      <div className="p-5 bg-[#0F1011] border border-[#23252A] rounded-lg mb-6">
        <h2 className="text-sm font-semibold mb-4">Account</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#8A8F98]">Email</span>
            <span className="text-sm">{user?.primaryEmailAddress?.emailAddress ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#8A8F98]">Plan</span>
            <span className="text-sm capitalize px-2 py-0.5 bg-[#5E6AD2]/10 text-[#5E6AD2] rounded-full text-xs font-medium">
              {profile?.plan ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Usage */}
      {profile?.usage && (
        <div className="p-5 bg-[#0F1011] border border-[#23252A] rounded-lg mb-6">
          <h2 className="text-sm font-semibold mb-4">Usage this month</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8A8F98]">Scans used</span>
              <span className="text-sm">
                {profile.usage.scansThisMonth} / {profile.usage.scansLimit === Infinity ? "Unlimited" : profile.usage.scansLimit}
              </span>
            </div>
            <div className="w-full h-2 bg-[#23252A] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#5E6AD2] rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (profile.usage.scansThisMonth / profile.usage.scansLimit) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-[#62666D]">
              {profile.usage.scansRemaining} scans remaining
            </p>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="p-5 bg-[#0F1011] border border-[#EB5757]/20 rounded-lg">
        <h2 className="text-sm font-semibold text-[#EB5757] mb-2">Danger zone</h2>
        <p className="text-xs text-[#8A8F98] mb-4">
          Permanently delete your account and all associated data.
        </p>
        <button className="px-4 py-2 text-xs font-medium text-[#EB5757] border border-[#EB5757]/20 rounded-md hover:bg-[#EB5757]/10 transition-colors">
          Delete account
        </button>
      </div>
    </div>
  );
}
