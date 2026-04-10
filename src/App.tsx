import { useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import {
  readSession, verifySession, redirectToLogin, clearSession,
  type BotiSession,
} from './lib/session';

type GuardState =
  | { kind: 'checking' }
  | { kind: 'denied_role' }
  | { kind: 'denied_verify'; reason: 'not_found' | 'inactive' | 'role_changed' | 'error' }
  | { kind: 'ok'; session: BotiSession };

function App() {
  const [state, setState] = useState<GuardState>({ kind: 'checking' });

  useEffect(() => {
    const s = readSession();
    if (!s) {
      redirectToLogin();
      return;
    }
    if (s.role !== 'owner') {
      setState({ kind: 'denied_role' });
      return;
    }
    // Defense against stale session: verify user still exists + active + still owner.
    verifySession(s).then((res) => {
      if (res.ok) {
        setState({ kind: 'ok', session: s });
      } else {
        // Clear the stale session so next redirect starts fresh.
        clearSession();
        setState({ kind: 'denied_verify', reason: res.reason });
      }
    });
  }, []);

  if (state.kind === 'checking') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-muted text-sm">
        Перевірка сесії…
      </div>
    );
  }

  if (state.kind === 'denied_role') {
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

  if (state.kind === 'denied_verify') {
    const msg: Record<typeof state.reason, string> = {
      not_found: 'Ваш обліковий запис більше не існує. Зверніться до адміністратора.',
      inactive: 'Ваш обліковий запис деактивовано. Зверніться до адміністратора.',
      role_changed: 'Вашу роль було змінено. Увійдіть повторно.',
      error: 'Не вдалося перевірити сесію. Спробуйте знову.',
    };
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-black text-text">Сесія недійсна</h1>
        <p className="text-muted text-sm max-w-md">{msg[state.reason]}</p>
        <button
          onClick={redirectToLogin}
          className="px-5 py-3 rounded-xl bg-brand text-white font-bold text-sm cursor-pointer hover:brightness-110 transition-all"
        >
          Перейти до входу
        </button>
      </div>
    );
  }

  return <AdminPanel session={state.session} />;
}

export default App;
