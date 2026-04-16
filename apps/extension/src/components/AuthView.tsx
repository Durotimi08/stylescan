import React, { useState } from "react";
import { setAuthToken, WEB_URL } from "../lib/api";

interface AuthViewProps {
  onSuccess: () => void;
}

export function AuthView({ onSuccess }: AuthViewProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await setAuthToken(token.trim());
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleOAuthLogin() {
    // Open the web app login page — Clerk will redirect to the callback after sign-in
    // The callback page at /auth/extension-callback will display the token for the user to copy
    const callbackUrl = encodeURIComponent("/auth/extension-callback");
    chrome.tabs.create({
      url: `${WEB_URL}/login?redirect_url=${callbackUrl}`,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center py-4">
        <h2 className="text-lg font-semibold mb-2">Welcome to StyleScan</h2>
        <p className="text-sm text-[#8A8F98]">
          Extract design DNA from any website for your AI coding agents.
        </p>
      </div>

      <button
        onClick={handleOAuthLogin}
        className="w-full py-2.5 px-4 bg-[#5E6AD2] hover:bg-[#7171E1] text-white text-sm font-medium rounded-md transition-colors duration-100"
      >
        Sign in with StyleScan
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#23252A]" />
        <span className="text-xs text-[#62666D]">or use API key</span>
        <div className="flex-1 h-px bg-[#23252A]" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="sk_..."
          className="w-full px-3 py-2 bg-[#0F1011] border border-[#23252A] rounded-md text-sm text-[#F7F8F8] placeholder:text-[#62666D] focus:border-[#5E6AD2] focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/20"
        />

        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="w-full py-2 px-4 bg-transparent border border-[#23252A] hover:bg-[#1A1B1E] hover:border-[#34363C] text-white text-sm font-medium rounded-md transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Connecting..." : "Connect with API Key"}
        </button>
      </form>

      {error && (
        <p className="text-xs text-[#EB5757] text-center">{error}</p>
      )}

      <p className="text-xs text-[#62666D] text-center mt-2">
        Don't have an account?{" "}
        <a
          href={`${WEB_URL}/signup`}
          target="_blank"
          rel="noopener"
          className="text-[#5E6AD2] hover:text-[#7171E1]"
        >
          Sign up free
        </a>
      </p>
    </div>
  );
}
