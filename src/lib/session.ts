// Reads the `boti_session` that config-crm writes to localStorage on login.
// owner-crm has no login screen of its own — users enter via config-crm,
// pick "Власник", authenticate, and get redirected here.

export interface BotiSession {
  user_login: string;
  user_name: string;
  role: string;        // "owner" / "Власник"
}

const SESSION_KEY = 'boti_session';
const CONFIG_CRM_URL = '../config-crm/';

export function readSession(): BotiSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as BotiSession;
    if (!s || !s.role) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function logout() {
  clearSession();
  window.location.href = CONFIG_CRM_URL;
}

export function redirectToLogin() {
  window.location.href = CONFIG_CRM_URL;
}
