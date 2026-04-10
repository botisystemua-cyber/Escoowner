import { sheetGet, sheetPost } from './sheets';

export type Role = 'Власник' | 'Менеджер' | 'Водій';

export interface StaffMember {
  id: string;         // STAFF_ID
  full_name: string;
  phone: string;
  email: string;
  role: Role;
  login: string;
  password: string;
  city: string;
  auto_id: string;
  auto_num: string;
  rate: string;
  rate_currency: string;
  status: string;     // "Активний" / "Неактивний"
  date_hired: string;
  last_activity: string;
  note: string;
}

export interface Owner {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  login: string;
  password: string;
  role: string;
  status: string;
  last_activity: string;
  date_created: string;
  note: string;
}

// Unified type for UI — owner + staff in one list
export interface User {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  role: Role;
  login: string;
  password: string;
  city: string;
  auto_id: string;
  auto_num: string;
  rate: string;
  rate_currency: string;
  status: string;
  date_hired: string;
  last_activity: string;
  note: string;
  is_owner: boolean;
}

const ROLE_RANK: Record<Role, number> = { 'Власник': 3, 'Менеджер': 2, 'Водій': 1 };

export function primaryRole(role: Role): Role {
  return role;
}

export function roleRank(role: Role): number {
  return ROLE_RANK[role] ?? 0;
}

function ownerToUser(o: Owner): User {
  return {
    id: o.id,
    full_name: o.full_name,
    phone: o.phone,
    email: o.email,
    role: 'Власник',
    login: o.login,
    password: o.password,
    city: '',
    auto_id: '',
    auto_num: '',
    rate: '',
    rate_currency: '',
    status: o.status,
    date_hired: o.date_created,
    last_activity: o.last_activity,
    note: o.note,
    is_owner: true,
  };
}

function staffToUser(s: StaffMember): User {
  return {
    ...s,
    role: (s.role || 'Водій') as Role,
    is_owner: false,
  };
}

// ---------- API calls ----------

export async function listAllUsers(): Promise<User[]> {
  const [ownerRes, staffRes] = await Promise.all([
    sheetGet<{ success: boolean; owner: Owner | null }>('getOwner'),
    sheetGet<{ success: boolean; staff: StaffMember[] }>('getStaff'),
  ]);
  const users: User[] = [];
  if (ownerRes.owner) users.push(ownerToUser(ownerRes.owner));
  for (const s of staffRes.staff ?? []) {
    users.push(staffToUser(s));
  }
  return users;
}

export async function createStaff(input: {
  full_name: string;
  phone: string;
  email: string;
  role: Role;
  login: string;
  password: string;
  city: string;
  auto_id: string;
  auto_num: string;
  rate: string;
  rate_currency: string;
  status: string;
  note: string;
}): Promise<{ id: string }> {
  return sheetPost<{ success: boolean; id: string }>('createStaff', input);
}

export async function updateStaff(id: string, patch: Record<string, unknown>): Promise<void> {
  await sheetPost('updateStaff', { id, ...patch });
}

export async function deleteStaff(id: string): Promise<void> {
  await sheetPost('deleteStaff', { id });
}
