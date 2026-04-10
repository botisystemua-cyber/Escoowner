import { useState, useEffect, useCallback } from 'react';
import { Users, Wifi, RefreshCw, ExternalLink, DollarSign, LogOut } from 'lucide-react';
import { Logo } from './shared';
import { StaffTab } from './StaffTab';
import { OnlineTab } from './OnlineTab';
import { listUsersByTenant, type User } from '../api/users';
import { logout, beatHeartbeat, type BotiSession } from '../lib/session';

type Tab = 'staff' | 'online' | 'finances' | 'crm';

const MENU_ITEMS: { key: Tab; label: string; shortLabel: string; icon: typeof Users; external?: string }[] = [
  { key: 'staff', label: 'Співробітники', shortLabel: 'Команда', icon: Users },
  { key: 'online', label: 'Онлайн', shortLabel: 'Онлайн', icon: Wifi },
  { key: 'finances', label: 'Фінанси', shortLabel: 'Фінанси', icon: DollarSign },
  { key: 'crm', label: 'CRM', shortLabel: 'CRM', icon: ExternalLink, external: '../passenger-crm/' },
];

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min

function isOnline(u: User): boolean {
  if (!u.last_login) return false;
  const t = new Date(u.last_login).getTime();
  if (isNaN(t)) return false;
  return Date.now() - t < ONLINE_THRESHOLD_MS;
}

export function AdminPanel({ session }: { session: BotiSession }) {
  const [tab, setTab] = useState<Tab>('staff');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await listUsersByTenant(session.tenant_id));
    } catch (e) {
      setError((e as Error).message || 'Помилка завантаження');
    }
    setLoading(false);
  }, [session.tenant_id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Poll online status every 30s (refetch users so last_login updates)
  useEffect(() => {
    const iv = setInterval(() => {
      listUsersByTenant(session.tenant_id).then(setUsers).catch(() => { /* ignore */ });
    }, 30000);
    return () => clearInterval(iv);
  }, [session.tenant_id]);

  // Heartbeat — mark this user as "online" every 60s while the tab is visible.
  // Without this, `users.last_login` only updates at login and the Online tab
  // would only see users for the first 5 minutes of their session.
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === 'visible') beatHeartbeat(session);
    };
    beat(); // fire immediately on mount
    const iv = setInterval(beat, 60000);
    document.addEventListener('visibilitychange', beat);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [session]);

  const onlineCount = users.filter(isOnline).length;

  const handleTabClick = (item: typeof MENU_ITEMS[0]) => {
    if (item.external) {
      window.open(item.external, '_blank');
      return;
    }
    setTab(item.key);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      {/* ═══ Sidebar — desktop ═══ */}
      <aside className="hidden lg:flex w-[280px] shrink-0 flex-col bg-white border-r border-border sticky top-0 h-[100dvh]">
        <div className="px-6 py-6 border-b border-border">
          <Logo size="md" />
          <div className="mt-3 text-xs font-bold text-text truncate">{session.tenant_name}</div>
          <div className="text-[11px] text-muted truncate">{session.user_name}</div>
        </div>
        <nav className="flex-1 px-4 py-5 space-y-1.5">
          {MENU_ITEMS.map(item => {
            const Icon = item.icon;
            const active = !item.external && tab === item.key;
            return (
              <button key={item.key} onClick={() => handleTabClick(item)}
                className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl text-base font-bold cursor-pointer transition-all ${active ? 'bg-brand text-white shadow-sm' : 'text-text-secondary hover:bg-bg'}`}>
                <Icon className="w-5 h-5" />
                {item.label}
                {item.key === 'online' && onlineCount > 0 && (
                  <span className={`ml-auto min-w-[22px] h-[22px] rounded-full text-xs font-bold flex items-center justify-center px-1 ${active ? 'bg-white/20 text-white' : 'bg-green-100 text-green-600'}`}>
                    {onlineCount}
                  </span>
                )}
                {item.external && <ExternalLink className="w-4 h-4 ml-auto opacity-40" />}
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-border space-y-2">
          <button onClick={loadAll}
            className="w-full flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold text-muted hover:bg-bg cursor-pointer transition-all">
            <RefreshCw className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
            Оновити
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold text-muted hover:bg-red-50 hover:text-red-600 cursor-pointer transition-all">
            <LogOut className="w-4.5 h-4.5" />
            Вийти
          </button>
        </div>
        <div className="px-6 pb-5 text-xs text-muted/50 font-medium">
          <span className="text-text/40 font-bold">Boti</span><span className="text-success/40 font-bold">Logistics</span> Owner v1.0
        </div>
      </aside>

      {/* ═══ Main area ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-30">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text truncate max-w-[120px]">{session.tenant_name}</span>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-red-50 cursor-pointer">
              <LogOut className="w-4 h-4 text-muted" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6 pb-[72px] lg:pb-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl text-sm font-semibold text-red-600">
              {error}
            </div>
          )}
          {loading ? (
            <div className="text-center py-24 text-muted">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-4" />
              <span className="text-base">Завантаження...</span>
            </div>
          ) : (
            <>
              {tab === 'staff' && (
                <StaffTab
                  users={users}
                  tenantId={session.tenant_id}
                  currentUserLogin={session.user_login}
                  onReload={loadAll}
                />
              )}
              {tab === 'online' && <OnlineTab users={users} onReload={loadAll} />}
              {tab === 'finances' && (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="text-center">
                    <DollarSign className="w-16 h-16 lg:w-20 lg:h-20 text-muted/30 mx-auto mb-4" />
                    <h2 className="text-2xl lg:text-4xl font-black text-text/30">Фінанси</h2>
                    <p className="text-base lg:text-lg text-muted mt-2">Поки що недоступні</p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ═══ Mobile bottom tab bar ═══ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-border px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-1.5">
          {MENU_ITEMS.map(item => {
            const Icon = item.icon;
            const active = !item.external && tab === item.key;
            return (
              <button key={item.key} onClick={() => handleTabClick(item)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[60px] cursor-pointer transition-all ${active ? 'text-brand' : 'text-muted'}`}>
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.key === 'online' && onlineCount > 0 && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center bg-green-500 text-white">
                      {onlineCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
