import { AdminPanel } from './components/AdminPanel';
import { readSession, type BotiSession } from './lib/session';

const DEFAULT_SESSION: BotiSession = {
  user_login: 'owner',
  user_name: 'Власник',
  role: 'owner',
};

function App() {
  const session = readSession() || DEFAULT_SESSION;
  return <AdminPanel session={session} />;
}

export default App;
