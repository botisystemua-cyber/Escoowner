import { supabase } from '../lib/supabase';

export type Role = 'owner' | 'manager' | 'driver';

export interface User {
  id: string;
  tenant_id: string;
  login: string;
  password: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  roles: Role[];
  is_active: boolean | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export type UserInput = Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login'>;

// Role hierarchy used for primary-icon selection and badge ordering.
// Higher = more privileged. A user with ['owner','driver'] is visually
// presented as an owner first, because that's the "highest hat" they wear.
const ROLE_RANK: Record<Role, number> = { owner: 3, manager: 2, driver: 1 };

/** Highest role in the user's roles array. Caller guarantees non-empty. */
export function primaryRole(roles: Role[]): Role {
  return [...roles].sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0];
}

/** Sort roles from highest to lowest privilege for consistent badge order. */
export function sortRoles(roles: Role[]): Role[] {
  return [...roles].sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a]);
}

export async function listUsersByTenant(tenantId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as User[];
}

export async function createUserForTenant(
  tenantId: string,
  input: Omit<UserInput, 'tenant_id'>,
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({ ...input, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data as User;
}

export async function updateUser(id: string, patch: Partial<UserInput>): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as User;
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
}
