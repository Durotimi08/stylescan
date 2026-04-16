const env = (import.meta as any).env ?? {};
const API_URL = env.VITE_API_URL ?? "http://localhost:3001";
export const WEB_URL = env.VITE_WEB_URL ?? "http://localhost:3000";

export async function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get("auth_token", (result) => {
      resolve(result.auth_token ?? null);
    });
  });
}

export async function setAuthToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ auth_token: token }, resolve);
  });
}

export async function clearAuthToken(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove("auth_token", resolve);
  });
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Not authenticated. Please sign in.");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error ?? `API error: ${res.status}`);
  }

  return res.json();
}

export async function submitScan(
  extraction: unknown,
  screenshot: Blob | null,
  mode: string
): Promise<{ scanId: string; status: string; estimatedMs: number }> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const formData = new FormData();
  formData.append("extraction", JSON.stringify(extraction));
  formData.append("mode", mode);

  if (screenshot) {
    formData.append("screenshot", screenshot, "page.png");
  }

  const res = await fetch(`${API_URL}/scans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error ?? `API error: ${res.status}`);
  }

  return res.json();
}

export async function pollScanStatus(
  scanId: string,
  intervalMs = 2000,
  maxAttempts = 60
): Promise<{ status: string; designMd?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await apiRequest<{
      status: string;
      design_md?: string;
    }>(`/scans/${scanId}`);

    if (result.status === "complete") {
      return { status: "complete", designMd: result.design_md };
    }

    if (result.status === "failed") {
      throw new Error("Scan failed");
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Scan timed out");
}
