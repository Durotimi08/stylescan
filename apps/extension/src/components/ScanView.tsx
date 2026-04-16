import React, { useState, useEffect } from "react";
import { pollScanStatus } from "../lib/api";

interface ScanViewProps {
  onScanStart: (scanId: string) => void;
  onScanComplete: (designMd: string) => void;
  onError: (error: string) => void;
  error: string | null;
}

export function ScanView({
  onScanStart,
  onScanComplete,
  onError,
  error,
}: ScanViewProps) {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setCurrentUrl(tabs[0].url ?? "");
        setCurrentTitle(tabs[0].title ?? "");
      }
    });
  }, []);

  async function handleScan() {
    setScanning(true);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        throw new Error("No active tab found");
      }

      // Inject content script
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content/index.js"],
        });
      } catch {
        // May already be injected
      }

      // Start scan via background script
      const result = await chrome.runtime.sendMessage({
        type: "START_SCAN",
        tabId: tab.id,
        mode: "full_page",
      });

      if (!result?.ok) {
        throw new Error(result?.error ?? "Scan failed");
      }

      onScanStart(result.scanId);

      // Poll for results
      const scanResult = await pollScanStatus(result.scanId);

      if (scanResult.designMd) {
        onScanComplete(scanResult.designMd);
      } else {
        throw new Error("No design.md in result");
      }
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setScanning(false);
    }
  }

  const isValidUrl =
    currentUrl.startsWith("http://") || currentUrl.startsWith("https://");

  return (
    <div className="flex flex-col gap-4">
      {/* Current page info */}
      <div className="p-3 bg-[#0F1011] border border-[#23252A] rounded-lg">
        <p className="text-xs text-[#62666D] mb-1">Current page</p>
        <p className="text-sm font-medium truncate">
          {currentTitle || "No page detected"}
        </p>
        <p className="text-xs text-[#8A8F98] truncate mt-0.5">
          {currentUrl || "Navigate to a webpage to scan"}
        </p>
      </div>

      {/* Scan button */}
      <button
        onClick={handleScan}
        disabled={scanning || !isValidUrl}
        className="w-full py-3 px-4 bg-[#5E6AD2] hover:bg-[#7171E1] active:scale-[0.98] text-white text-sm font-medium rounded-md transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {scanning ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Scanning...
          </span>
        ) : (
          "Scan this page"
        )}
      </button>

      {!isValidUrl && (
        <p className="text-xs text-[#F2994A] text-center">
          Navigate to a website to start scanning
        </p>
      )}

      {error && (
        <div className="p-3 bg-[#EB5757]/10 border border-[#EB5757]/20 rounded-md">
          <p className="text-xs text-[#EB5757]">{error}</p>
        </div>
      )}

      {/* What you get */}
      <div className="mt-2 pt-4 border-t border-[#23252A]">
        <p className="text-xs text-[#62666D] mb-3">What you'll get:</p>
        <div className="flex flex-col gap-2">
          {[
            ["design.md", "Full design system spec for AI agents"],
            ["tokens.json", "W3C design tokens (colors, type, spacing)"],
            ["components.json", "Component patterns & anti-patterns"],
          ].map(([name, desc]) => (
            <div key={name} className="flex items-start gap-2">
              <span className="text-[#5E6AD2] text-xs mt-0.5">*</span>
              <div>
                <span className="text-xs font-medium text-[#F7F8F8]">
                  {name}
                </span>
                <span className="text-xs text-[#62666D] ml-1.5">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
