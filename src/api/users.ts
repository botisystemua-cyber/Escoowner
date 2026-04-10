import { sheetPost } from './sheets';

export type Role = 'Власник' | 'Менеджер' | 'Водій';

// Shape returned by Script-config.gs handleGetStaff()
export interface StaffRaw {
  rowNum: number;
  staffId: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  login: string;
  password: string;
  city: string;
  autoId: string;
  autoNum: string;
  rate: string;
  rateCur: string;
  status: string;
  dateHired: string;
  lastActive: string;
  note: string;
}

// Unified type for UI
export interface User {
  staffId: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  login: string;
  password: string;
  city: string;
  autoId: string;
  autoNum: string;
  rate: string;
  rateCur: string;
  status: string;
  dateHired: string;
  lastActive: string;
  note: string;
  isOwner?: boolean;
}

// Shape returned by Script-config.gs handleGetOwner()
export interface OwnerRaw {
  userId: string;
  name: string;
  phone: string;
  email: string;
  login: string;
  password: string;
  role: string;
  status: string;
  dateCreated: string;
  lastActive: string;
  note: string;
}

function rawToUser(r: StaffRaw): User {
  return {
    staffId: r.staffId,
    name: r.name,
    phone: r.phone,
    email: r.email,
    role: (r.role || 'Водій') as Role,
    login: r.login,
    password: r.password,
    city: r.city,
    autoId: r.autoId,
    autoNum: r.autoNum,
    rate: r.rate,
    rateCur: r.rateCur,
    status: r.status,
    dateHired: r.dateHired,
    lastActive: r.lastActive,
    note: r.note,
  };
}

// ---------- API calls ----------

export async function listStaff(): Promise<User[]> {
  const res = await sheetPost<{ success: boolean; staff: StaffRaw[] }>('getStaff');
  return (res.staff ?? []).map(rawToUser);
}

export async function createStaff(input: {
  name: string;
  phone: string;
  email: string;
  role: string;
  login: string;
  password: string;
  city: string;
  autoId: string;
  autoNum: string;
  rate: string;
  rateCur: string;
  status: string;
  note: string;
}): Promise<{ success: boolean; staffId: string }> {
  return sheetPost<{ success: boolean; staffId: string }>('addStaff', { staff: input });
}

export async function updateStaff(staffId: string, patch: Record<string, unknown>): Promise<void> {
  await sheetPost('updateStaff', { staff: { staffId, ...patch } });
}

export async function deleteStaff(staffId: string): Promise<void> {
  await sheetPost('deleteStaff', { staffId });
}

// ---------- Owner API calls ----------

export async function getOwner(): Promise<User[]> {
  const res = await sheetPost<{ success: boolean; owners: OwnerRaw[] }>('getOwner');
  return (res.owners ?? []).map(o => ({
    staffId: o.userId,
    name: o.name,
    phone: o.phone,
    email: o.email,
    role: 'Власник' as Role,
    login: o.login,
    password: o.password,
    city: '',
    autoId: '',
    autoNum: '',
    rate: '',
    rateCur: '',
    status: o.status,
    dateHired: o.dateCreated,
    lastActive: o.lastActive,
    note: o.note,
    isOwner: true,
  }));
}

export async function updateOwner(userId: string, patch: Record<string, unknown>): Promise<void> {
  await sheetPost('updateOwner', { owner: { userId, ...patch } });
}

// Online users — pre-computed by the script
export interface OnlineUser {
  staffId: string;
  name: string;
  role: string;
  lastActive: string;
  status: string;
  city: string;
  isOnline: boolean;
}

export async function getOnlineUsers(): Promise<OnlineUser[]> {
  const res = await sheetPost<{ success: boolean; users: OnlineUser[] }>('getOnlineUsers');
  return res.users ?? [];
}
