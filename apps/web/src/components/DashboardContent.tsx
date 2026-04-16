"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

interface Scan {
  id: string;
  source_url: string;
  mode: string;
  status: string;
  confidence: number | null;
  created_at: string;
  completed_at: string | null;
}

export function DashboardContent() {
  const { getToken } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadScans();
  }, []);

  async function loadScans() {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await apiFetch<{ scans: Scan[] }>("/scans", { token });
      setScans(data.scans);
    } catch (err) {
      console.error("Failed to load scans:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUrlScan(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setScanning(true);
    try {
      const token = await getToken();
      if (!token) return;

      await apiFetch("/scans", {
        token,
        method: "POST",
        body: JSON.stringify({ sourceUrl: urlInput.trim(), mode: "full_page" }),
      });

      setUrlInput("");
      loadScans();
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setScanning(false);
    }
  }

  async function handleDownload(scanId: string, format: string) {
    const token = await getToken();
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${apiUrl}/scans/${scanId}/${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scans</h1>
          <p className="text-sm text-[#8A8F98] mt-1">
            Extract design systems from any website
          </p>
        </div>
      </div>

      {/* URL scan input */}
      <form onSubmit={handleUrlScan} className="flex gap-3 mb-8">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://linear.app"
          className="flex-1 px-4 py-2.5 bg-[#0F1011] border border-[#23252A] rounded-md text-sm text-[#F7F8F8] placeholder:text-[#62666D] focus:border-[#5E6AD2] focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/20"
        />
        <button
          type="submit"
          disabled={scanning || !urlInput.trim()}
          className="px-6 py-2.5 bg-[#5E6AD2] hover:bg-[#7171E1] active:scale-[0.98] text-white text-sm font-medium rounded-md transition-all disabled:opacity-40"
        >
          {scanning ? "Scanning..." : "Scan URL"}
        </button>
      </form>

      {/* Scans list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[#5E6AD2] border-t-transparent rounded-full" />
        </div>
      ) : scans.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#23252A] rounded-lg">
          <p className="text-sm text-[#8A8F98] mb-2">No scans yet</p>
          <p className="text-xs text-[#62666D]">
            Paste a URL above or use the browser extension to scan a page
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {scans.map((scan) => (
            <div
              key={scan.id}
              className="flex items-center justify-between p-4 bg-[#0F1011] border border-[#23252A] rounded-lg hover:border-[#34363C] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {scan.source_url}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <StatusBadge status={scan.status} />
                  {scan.confidence && (
                    <span className="text-xs text-[#62666D]">
                      {Math.round(scan.confidence * 100)}% confidence
                    </span>
                  )}
                  <span className="text-xs text-[#62666D]">
                    {new Date(scan.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {scan.status === "complete" && (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleDownload(scan.id, "design.md")}
                    className="px-3 py-1.5 text-xs font-medium bg-[#5E6AD2]/10 text-[#5E6AD2] border border-[#5E6AD2]/20 rounded-md hover:bg-[#5E6AD2]/20 transition-colors"
                  >
                    design.md
                  </button>
                  <button
                    onClick={() => handleDownload(scan.id, "tokens.json")}
                    className="px-3 py-1.5 text-xs font-medium text-[#8A8F98] border border-[#23252A] rounded-md hover:bg-[#1A1B1E] transition-colors"
                  >
                    tokens.json
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: "bg-[#F2994A]/10 text-[#F2994A] border-[#F2994A]/20",
    running: "bg-[#5E6AD2]/10 text-[#5E6AD2] border-[#5E6AD2]/20",
    complete: "bg-[#4CB782]/10 text-[#4CB782] border-[#4CB782]/20",
    failed: "bg-[#EB5757]/10 text-[#EB5757] border-[#EB5757]/20",
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status] ?? styles.queued}`}
    >
      {status}
    </span>
  );
}
