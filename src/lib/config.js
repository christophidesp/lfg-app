/**
 * App base URL — reads from VITE_APP_BASE_URL, falls back to window.location.origin.
 * Always strip trailing slash so callers can write `${APP_BASE_URL}/path`.
 */
export const APP_BASE_URL = (
  import.meta.env.VITE_APP_BASE_URL || window.location.origin
).replace(/\/+$/, '');
