// Reads the `boti_session` that config-crm writes to localStorage on login.
// owner-crm has no login screen of its own — users enter via config-crm,
// pick "Власник", authenticate, and get redirected here.

import { supabase } from './supabase';

export type Role = 'owner' | 'manager' | 'driver';

// Session shape after the multi-role migration:
//   - `role` is the ACTIVE role the user chose on the login screen. It's a
//     single string so downstream modules (passenger-crm, driver-crm) don't
//     need to be aware of the array. They keep reading `session.role` like
//     before and see whatever "hat" the user entered as.
//   - `roles` is the FULL set of roles the user has in the DB. owner-crm
//     uses it to decide which self-actions are allowed (e.g. a user with
//     ['owner','driver'] can freely flip hats on next login).
// Legacy sessions written by the pre-migration login code only have `role`
// and no `roles`. We fall back to `[role]` so old tabs keep working.
export interface BotiSession {
  tenant_id: string;
  tenant_name: string;
  user_login: string;
  user_name: string;
  role: Role;          // active role chosen at login
  roles?: Role[];      // full role set from DB (optional for legacy sessions)
  modules: string[];
}

const SESSION_KEY = 'boti_session';
const CONFIG_CRM_URL = '../config-crm/';

export function readSession(): BotiSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as BotiSession;
    if (!s || !s.tenant_id || !s.role) return null;
    // Legacy fallback: pre-migration sessions have no `roles` array.
    if (!Array.isArray(s.roles) || s.roles.length === 0) {
      s.roles = [s.role];
    }
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

/**
 * Verifies that the session's user still exists in the DB, is active, and
 * still has the claimed active role within their full `roles` array.
 * Used at owner-crm startup so a user deleted/deactivated by super-admin,
 * or one whose roles were edited in another tab, can't keep working against
 * a stale localStorage session.
 */
export async function verifySession(s: BotiSession): Promise<
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'inactive' | 'role_changed' | 'error' }
> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, login, roles, tenant_id, is_active')
      .eq('tenant_id', s.tenant_id)
      .eq('login', s.user_login)
      .maybeSingle();
    if (error) return { ok: false, reason: 'error' };
    if (!data) return { ok: false, reason: 'not_found' };
    if (data.is_active === false) return { ok: false, reason: 'inactive' };
    const dbRoles = Array.isArray(data.roles) ? (data.roles as Role[]) : [];
    if (!dbRoles.includes(s.role)) return { ok: false, reason: 'role_changed' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/**
 * Heartbeat — writes users.last_login = now() for the current session user.
 * Fire-and-forget. Used by an interval in AdminPanel so that the Online tab
 * shows managers/drivers/owners currently sitting in the app (not just those
 * who logged in within the last 5 minutes).
 */
export function beatHeartbeat(s: BotiSession): void {
  void supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('tenant_id', s.tenant_id)
    .eq('login', s.user_login);
}
