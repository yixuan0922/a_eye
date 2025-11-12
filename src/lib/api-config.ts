/**
 * API Configuration for Frontend
 *
 * This file provides the base URL for all API calls.
 * In production, this will point to the API Gateway.
 * In development, it can point to localhost.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : '');

/**
 * Helper function to construct API URLs
 * @param path - API path (e.g., '/api/violations')
 * @returns Full URL for the API endpoint
 */
export function getApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // If API_BASE_URL is empty, return the path as-is (for Next.js API routes)
  if (!API_BASE_URL) {
    return `/${cleanPath}`;
  }

  return `${API_BASE_URL}/${cleanPath}`;
}

/**
 * Fetch wrapper that automatically uses the correct API base URL
 * @param path - API path
 * @param options - Fetch options
 * @returns Fetch promise
 */
export async function apiFetch(path: string, options?: RequestInit) {
  const url = getApiUrl(path);
  return fetch(url, options);
}

// Export for use in components
export default {
  API_BASE_URL,
  getApiUrl,
  apiFetch,
};
