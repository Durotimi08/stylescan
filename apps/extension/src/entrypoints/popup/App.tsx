import React, { useState, useEffect } from "react";
import { ScanView } from "../../components/ScanView";
import { AuthView } from "../../components/AuthView";
import { ResultView } from "../../components/ResultView";
import { getAuthToken } from "../../lib/api";

type View = "loading" | "auth" | "scan" | "scanning" | "result";

export function App() {
  const [view, setView] = useState<View>("loading");
  const [scanId, setScanId] = useState<string | null>(null);
  const [designMd, setDesignMd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = await getAuthToken();
    setView(token ? "scan" : "auth");
  }

  function handleAuthSuccess() { setView("scan"); }
  function handleScanStart(id: string) { setScanId(id); setView("scanning"); }
  function handleScanComplete(md: string) { setDesignMd(md); setView("result"); }
  function handleScanError(msg: string) { setError(msg); setView("scan"); }
  function handleBack() { setView("scan"); setScanId(null); setDesignMd(null); setError(null); }

  return (
    <div className="flex flex-col min-h-[480px] bg-[#08090A] text-[#F7F8F8]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#23252A]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#5E6AD2] flex items-center justify-center text-xs font-bold">S</div>
          <span className="text-sm font-semibold">StyleScan</span>
        </div>
        <span className="text-xs text-[#62666D]">v0.1.0</span>
      </header>
      <main className="flex-1 px-4 py-4">
        {view === "loading" && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-[#5E6AD2] border-t-transparent rounded-full" />
          </div>
        )}
        {view === "auth" && <AuthView onSuccess={handleAuthSuccess} />}
        {view === "scan" && <ScanView onScanStart={handleScanStart} onScanComplete={handleScanComplete} onError={handleScanError} error={error} />}
        {view === "scanning" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="animate-spin w-8 h-8 border-2 border-[#5E6AD2] border-t-transparent rounded-full" />
            <p className="text-sm text-[#8A8F98]">Scanning page design...</p>
            <p className="text-xs text-[#62666D]">This usually takes 15-30 seconds</p>
          </div>
        )}
        {view === "result" && designMd && <ResultView designMd={designMd} onBack={handleBack} />}
      </main>
    </div>
  );
}
