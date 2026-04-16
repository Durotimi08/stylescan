import { defineBackground } from "wxt/sandbox";
import { submitScan, pollScanStatus, getAuthToken, setAuthToken, WEB_URL } from "../lib/api";

export default defineBackground(() => {
  // Watch for the auth callback page — auto-grab the token from the URL hash
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const callbackPath = "/auth/extension-callback";
    if (
      changeInfo.url &&
      changeInfo.url.includes(callbackPath) &&
      changeInfo.url.includes("#token=")
    ) {
      const hash = new URL(changeInfo.url).hash;
      const token = hash.replace("#token=", "");
      if (token) {
        setAuthToken(token).then(() => {
          console.log("[StyleScan] Auth token received from callback");
          // Close the callback tab
          chrome.tabs.remove(tabId);
        });
      }
    }
  });
  // Full-page screenshot capture using chrome.tabs API
  async function captureTabScreenshot(tabId: number): Promise<Blob> {
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
      format: "png",
      quality: 90,
    });

    // Convert data URL to Blob
    const res = await fetch(dataUrl);
    return res.blob();
  }

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "START_SCAN") {
      handleStartScan(msg.tabId, msg.mode)
        .then(sendResponse)
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true; // Keep channel open
    }

    if (msg.type === "CHECK_AUTH") {
      getAuthToken()
        .then((token) => sendResponse({ authenticated: !!token }))
        .catch(() => sendResponse({ authenticated: false }));
      return true;
    }

    if (msg.type === "CAPTURE_FULL_PAGE") {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ ok: false, error: "No tab ID" });
        return;
      }
      captureTabScreenshot(tabId)
        .then((blob) => sendResponse({ ok: true, data: blob }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }
  });

  async function handleStartScan(
    tabId: number,
    mode: string
  ): Promise<{ ok: boolean; scanId?: string; error?: string }> {
    try {
      // 1. Inject content script and extract DOM data
      const extractionResult = await chrome.tabs.sendMessage(tabId, {
        type: "EXTRACT",
      });

      if (!extractionResult?.ok) {
        throw new Error(
          extractionResult?.error ?? "Failed to extract page data"
        );
      }

      // 2. Capture screenshot
      const screenshot = await captureTabScreenshot(tabId);

      // 3. Submit to API
      const { scanId } = await submitScan(
        extractionResult.data,
        screenshot,
        mode
      );

      return { ok: true, scanId };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  // Register content script dynamically
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/index.js"],
      });
    } catch {
      // Script may already be injected
    }
  });
});
