import { defineContentScript } from "wxt/sandbox";
import { extractRawData } from "../content/extract";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === "EXTRACT") {
        try {
          const extraction = extractRawData();
          sendResponse({ ok: true, data: extraction });
        } catch (err) {
          sendResponse({ ok: false, error: (err as Error).message });
        }
        return true; // Keep the message channel open for async response
      }

      if (msg.type === "EXTRACT_REGION") {
        try {
          // For region extraction, we'd use a selector or coordinates
          // For MVP, extract the full page
          const extraction = extractRawData();
          sendResponse({ ok: true, data: extraction });
        } catch (err) {
          sendResponse({ ok: false, error: (err as Error).message });
        }
        return true;
      }
    });

    // Inject a small indicator that the content script is loaded
    console.log("[StyleScan] Content script loaded");
  },
});
