import { useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { readSession, redirectToLogin, type BotiSession } from './lib/session';

function App() {
  const [session, setSession] = useState<BotiSession | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const s = readSession();
    if (!s) {
      redirectToLogin();
      return;
    }
    // config-crm sets role as "owner" or "Власник"
    const r = (s.role || '').toLowerCase();
    if (r !== 'owner' && r !== 'власник') {
      setDenied(true);
      return;
    }
    setSession(s);
  }, []);

  if (denied) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-black text-text">Доступ заборонено</h1>
        <p className="text-muted text-sm max-w-md">
          Ця сторінка доступна лише для ролі <b>Власник</b>. Увійдіть через вхідний екран,
          обравши відповідну роль.
        </p>
        <button
          onClick={redirectToLogin}
          className="px-5 py-3 rounded-xl bg-brand text-white font-bold text-sm cursor-pointer hover:brightness-110 transition-all"
        >
          Перейти до входу
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-muted text-sm">
        Завантаження…
      </div>
    );
  }

  return <AdminPanel session={session} />;
}

export default App;
