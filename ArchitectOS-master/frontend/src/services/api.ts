const API_BASE = "/api";

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, init);
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        "Cannot reach the backend. Run: npm run dev -w backend (must show 'Backend on http://localhost:3000')"
      );
    }
    throw e;
  }
}

export async function generateArchitecture(prompt: string, level: number, syntax: string = "Hide Syntax") {
  const res = await apiFetch("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, level, syntax }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function generateReadme(architecture: any, prompt: string) {
  const res = await apiFetch("/readme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ architecture, prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  const data = await res.json();
  return data.readme;
}

export async function getFileStructure(architecture: any) {
  const res = await apiFetch("/file-structure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ architecture }),
  });
  if (!res.ok) throw new Error("Failed to get file structure");
  const data = await res.json();
  return data.files;
}

export async function analyzeCodebase(files: { path: string; content: string }[]) {
  const res = await apiFetch("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function getAstPreview(files: { path: string; content: string }[]) {
  const res = await apiFetch("/ast-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}
