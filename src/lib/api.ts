// ============================================================================
// INTERVIEWX AI — BACKEND API HELPER
// The frontend talks ONLY to the Express backend (which holds every privileged
// key). In development and self-hosted production the backend serves the
// frontend, so same-origin relative paths work. On Vercel (frontend) +
// Render (backend), set VITE_API_BASE to the Render URL, e.g.
//   VITE_API_BASE=https://interviewx-ai-backend.onrender.com
// ============================================================================
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') || '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
