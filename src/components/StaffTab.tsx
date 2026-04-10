import { useState } from 'react';
import {
  RefreshCw, Pencil, Trash2, X, Save, UserPlus,
  Truck as TruckIcon, Users as UsersIcon, ShieldCheck,
  MapPin, Car,
} from 'lucide-react';
import {
  createStaff, updateStaff, deleteStaff,
  type User, type Role,
} from '../api/users';

type RoleFilter = 'all' | Role;

const ROLE_LABEL: Record<Role, string> = {
  'Власник': 'Власник',
  'Менеджер': 'Менеджер',
  'Водій': 'Водій',
};

const FILTERS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'Всі' },
  { key: 'Власник', label: 'Власники' },
  { key: 'Менеджер', label: 'Менеджери' },
  { key: 'Водій', label: 'Водії' },
];

function avatarIcon(role: Role, size = 'w-5 h-5') {
  if (role === 'Власник') return <ShieldCheck className={size} />;
  if (role === 'Менеджер') return <UsersIcon className={size} />;
  return <TruckIcon className={size} />;
}

function roleBg(role: Role) {
  if (role === 'Власник') return 'bg-violet-50 text-violet-600 border-violet-200';
  if (role === 'Менеджер') return 'bg-blue-50 text-blue-600 border-blue-200';
  return 'bg-emerald-50 text-emerald-600 border-emerald-200';
}

function roleActiveClass(role: Role) {
  if (role === 'Власник')  return 'bg-violet-500 text-white shadow-sm';
  if (role === 'Менеджер') return 'bg-blue-500 text-white shadow-sm';
  return 'bg-emerald-500 text-white shadow-sm';
}

function RoleIcon({ role, className }: { role: Role; className?: string }) {
  const Icon = role === 'Водій' ? TruckIcon : role === 'Менеджер' ? UsersIcon : ShieldCheck;
  return <Icon className={className} />;
}

type FormState = {
  login: string;
  password: string;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  city: string;
  auto_id: string;
  auto_num: string;
  rate: string;
  rate_currency: string;
  status: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  login: '',
  password: '',
  full_name: '',
  email: '',
  phone: '',
  role: 'Водій',
  city: '',
  auto_id: '',
  auto_num: '',
  rate: '',
  rate_currency: 'CHF',
  status: 'Активний',
  note: '',
};

function userToForm(u: User): FormState {
  return {
    login: u.login ?? '',
    password: u.password ?? '',
    full_name: u.full_name ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    role: u.role || 'Водій',
    city: u.city ?? '',
    auto_id: u.auto_id ?? '',
    auto_num: u.auto_num ?? '',
    rate: u.rate ?? '',
    rate_currency: u.rate_currency || 'CHF',
    status: u.status || 'Активний',
    note: u.note ?? '',
  };
}

function humanizeError(e: unknown): string {
  const msg = (e as Error)?.message || String(e || '');
  if (/вже існує/i.test(msg) || /зайнятий/i.test(msg)) {
    return msg;
  }
  return msg || 'Невідома помилка';
}

export function StaffTab({
  users, currentUserLogin, onReload,
}: {
  users: User[];
  currentUserLogin: string;
  onReload: () => void;
}) {
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [editItem, setEditItem] = useState<User | null>(null);
  const [isNew, setIsNew] = useState(false);

  const filtered = filter === 'all'
    ? users
    : users.filter(u => u.role === filter);
  const countByRole = (r: Role) => users.filter(u => u.role === r).length;

  const handleSave = async (form: FormState) => {
    const payload = {
      login: form.login.trim(),
      password: form.password.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      city: form.city.trim(),
      auto_id: form.auto_id.trim(),
      auto_num: form.auto_num.trim(),
      rate: form.rate.trim(),
      rate_currency: form.rate_currency.trim(),
      status: form.status,
      note: form.note.trim(),
    };
    try {
      if (isNew) {
        await createStaff(payload);
      } else if (editItem) {
        await updateStaff(editItem.id, payload);
      }
      setEditItem(null);
      onReload();
    } catch (e) {
      alert('Помилка: ' + humanizeError(e));
    }
  };

  const handleDelete = async (u: User) => {
    if (u.is_owner) {
      alert('Власника видалити неможливо. Редагуйте через config-crm.');
      return;
    }
    if (u.login === currentUserLogin) {
      alert('Ви не можете видалити власний обліковий запис.');
      return;
    }
    if (!confirm(`Видалити ${u.full_name || u.login}?`)) return;
    try {
      await deleteStaff(u.id);
      onReload();
    } catch (e) {
      alert('Помилка: ' + humanizeError(e));
    }
  };

  return (
    <div className="space-y-3 lg:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 lg:gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl text-xs lg:text-sm font-bold cursor-pointer transition-all ${filter === f.key ? 'bg-brand text-white' : 'bg-white text-muted border border-border hover:bg-bg'}`}>
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-0.5 opacity-60">({countByRole(f.key as Role)})</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditItem({} as User); setIsNew(true); }}
          className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg lg:rounded-xl bg-brand text-white text-xs lg:text-sm font-bold cursor-pointer hover:brightness-110 transition-all"
        >
          <UserPlus className="w-4 h-4 lg:w-5 lg:h-5" /> Додати
        </button>
      </div>

      {/* Users list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 lg:py-16 text-muted text-sm lg:text-base">Немає співробітників</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 lg:gap-4">
          {filtered.map(u => {
            const isSelf = u.login === currentUserLogin;
            const deleteLocked = u.is_owner || isSelf;
            const deleteTitle = u.is_owner
              ? 'Власника видалити неможливо'
              : isSelf
                ? 'Не можна видалити власний обліковий запис'
                : 'Видалити';
            return (
            <div
              key={u.id}
              className={`rounded-xl lg:rounded-2xl border overflow-hidden shadow-sm ${
                u.is_owner ? 'bg-violet-50/40 border-violet-200' : 'bg-white border-border'
              }`}
            >
              <div className="p-3 lg:p-5 flex items-center gap-3 lg:gap-4">
                <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0 ${roleBg(u.role)}`}>
                  {avatarIcon(u.role, 'w-4 h-4 lg:w-5 lg:h-5')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 lg:gap-2 flex-wrap">
                    <span className="text-sm lg:text-base font-bold text-text truncate">
                      {u.full_name || <span className="italic text-muted">без імені</span>}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] lg:text-xs font-bold px-2 lg:px-2.5 py-0.5 rounded-full border ${roleBg(u.role)}`}>
                      <RoleIcon role={u.role} className="w-3 h-3" />
                      {ROLE_LABEL[u.role]}
                    </span>
                    {isSelf && (
                      <span className="text-[10px] lg:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                        Це ви
                      </span>
                    )}
                    {u.status === 'Неактивний' && (
                      <span className="text-[10px] lg:text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                        Неактивний
                      </span>
                    )}
                  </div>
                  <div className="text-xs lg:text-sm text-muted mt-0.5 lg:mt-1 truncate">
                    <span className="font-mono">{u.login}</span>
                    {u.phone && <span className="ml-2 lg:ml-3">{u.phone}</span>}
                    {u.email && <span className="ml-2 lg:ml-3 truncate">{u.email}</span>}
                  </div>
                  {(u.city || u.auto_num) && (
                    <div className="flex items-center gap-2 lg:gap-3 mt-0.5 lg:mt-1 text-[10px] lg:text-xs text-muted/70">
                      {u.city && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />{u.city}
                        </span>
                      )}
                      {u.auto_num && (
                        <span className="flex items-center gap-0.5">
                          <Car className="w-3 h-3" />{u.auto_num}
                        </span>
                      )}
                      {u.rate && (
                        <span>{u.rate} {u.rate_currency}</span>
                      )}
                    </div>
                  )}
                  {u.last_activity && (
                    <div className="text-[10px] lg:text-xs text-muted/60 mt-0.5 lg:mt-1">
                      Остання активність: {u.last_activity}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 lg:gap-1.5 shrink-0">
                  <button onClick={() => { setEditItem(u); setIsNew(false); }}
                    className="p-1.5 lg:p-2.5 rounded-lg lg:rounded-xl hover:bg-blue-50 cursor-pointer transition-all">
                    <Pencil className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    disabled={deleteLocked}
                    title={deleteTitle}
                    className={`p-1.5 lg:p-2.5 rounded-lg lg:rounded-xl transition-all ${
                      deleteLocked
                        ? 'opacity-30 cursor-not-allowed'
                        : 'hover:bg-red-50 cursor-pointer'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {editItem && (
        <UserModal
          initial={isNew ? EMPTY_FORM : userToForm(editItem)}
          isNew={isNew}
          isOwner={!isNew && editItem.is_owner}
          onClose={() => setEditItem(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function UserModal({
  initial, isNew, isOwner, onClose, onSave,
}: {
  initial: FormState;
  isNew: boolean;
  isOwner: boolean;
  onClose: () => void;
  onSave: (f: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const ALL_ROLES: Role[] = ['Водій', 'Менеджер', 'Власник'];

  const submit = async () => {
    if (!form.login.trim() || !form.password.trim()) {
      alert('Логін і пароль обов\'язкові');
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 lg:px-6 pt-5 lg:pt-6 pb-3 lg:pb-4 border-b border-border shrink-0">
          <h2 className="text-lg lg:text-xl font-extrabold text-text">
            {isNew ? 'Новий співробітник' : 'Редагувати'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-bg cursor-pointer">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-4 lg:py-5 space-y-3 lg:space-y-4">
          {/* Role select */}
          <div>
            <label className="block text-[10px] lg:text-xs font-bold text-muted uppercase tracking-wider mb-1.5 lg:mb-2">
              Роль
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_ROLES.map(role => {
                const active = form.role === role;
                return (
                  <button
                    key={role}
                    onClick={() => !isOwner && set('role', role)}
                    disabled={isOwner}
                    className={`flex items-center justify-center gap-2 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-all ${
                      active ? roleActiveClass(role) : 'bg-bg text-muted border border-border hover:bg-white'
                    } ${isOwner ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    <RoleIcon role={role} className="w-4 h-4 lg:w-5 lg:h-5" />
                    {ROLE_LABEL[role]}
                  </button>
                );
              })}
            </div>
            {isOwner && (
              <div className="mt-2 text-[11px] text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                Роль власника редагується тільки в config-crm.
              </div>
            )}
          </div>

          <F label="ПІБ" value={form.full_name} onChange={v => set('full_name', v)} autoFocus />
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <F label="Телефон" value={form.phone} onChange={v => set('phone', v)} type="tel" />
            <F label="Email" value={form.email} onChange={v => set('email', v)} type="email" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <F label="Логін" value={form.login} onChange={v => set('login', v)} />
            <F label="Пароль" value={form.password} onChange={v => set('password', v)} />
          </div>

          {/* Driver-specific fields */}
          {(form.role === 'Водій' || form.city || form.auto_num) && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <F label="Місто базування" value={form.city} onChange={v => set('city', v)} />
                <F label="Номер авто" value={form.auto_num} onChange={v => set('auto_num', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <F label="Ставка" value={form.rate} onChange={v => set('rate', v)} />
                <div>
                  <label className="block text-[10px] lg:text-xs font-bold text-muted uppercase tracking-wider mb-1 lg:mb-1.5">Валюта ставки</label>
                  <select
                    value={form.rate_currency}
                    onChange={e => set('rate_currency', e.target.value)}
                    className="w-full px-3 lg:px-4 py-2.5 lg:py-3 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:border-brand transition-all"
                  >
                    {['CHF', 'EUR', 'USD', 'UAH', 'PLN', 'CZK'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <label className="flex items-center gap-3 px-4 py-3 bg-bg rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={form.status === 'Активний'}
              onChange={e => set('status', e.target.checked ? 'Активний' : 'Неактивний')}
              className="w-5 h-5 accent-brand cursor-pointer"
            />
            <span className="text-sm font-bold text-text">Активний</span>
          </label>

          <F label="Примітка" value={form.note} onChange={v => set('note', v)} />
        </div>

        <div className="px-5 lg:px-6 py-4 lg:py-5 border-t border-border shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={submit}
            disabled={saving}
            className="w-full py-3 lg:py-4 rounded-2xl bg-brand text-white font-bold text-sm lg:text-base flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-all disabled:opacity-40"
          >
            {saving ? <RefreshCw className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" /> : <Save className="w-4 h-4 lg:w-5 lg:h-5" />}
            {saving ? 'Збереження...' : isNew ? 'Додати' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({
  label, value, onChange, type, autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] lg:text-xs font-bold text-muted uppercase tracking-wider mb-1 lg:mb-1.5">{label}</label>
      <input
        type={type || 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="w-full px-3 lg:px-4 py-2.5 lg:py-3 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-brand transition-all"
      />
    </div>
  );
}
