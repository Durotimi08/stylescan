"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function ExtensionCallbackPage() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setStatus("error");
      setError("Not signed in. Please sign in first.");
      return;
    }

    sendTokenToExtension();
  }, [isLoaded, isSignedIn]);

  async function sendTokenToExtension() {
    try {
      const token = await getToken();
      if (!token) {
        setStatus("error");
        setError("Could not get session token.");
        return;
      }

      // Put the token in the URL hash — the extension's background script
      // watches for tab URL changes on this path and grabs it automatically.
      // This triggers chrome.tabs.onUpdated in the extension.
      window.location.hash = `token=${token}`;

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08090A]">
      <div className="max-w-md w-full p-8 bg-[#0F1011] border border-[#23252A] rounded-lg text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin w-8 h-8 border-2 border-[#5E6AD2] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm text-[#8A8F98]">Connecting to extension...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-[#4CB782]/10 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#4CB782" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Connected!</h2>
            <p className="text-sm text-[#8A8F98]">
              Your extension is now authenticated. This tab will close automatically.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-[#EB5757]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-[#EB5757] text-xl">!</span>
            </div>
            <h2 className="text-lg font-semibold mb-2">Connection failed</h2>
            <p className="text-sm text-[#EB5757]">{error}</p>
          </>
        )}
      </div>
    </div>
  );
}
