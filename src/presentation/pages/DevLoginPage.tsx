import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/application/stores/authStore';
import { useAthleteStore } from '@/application/stores/athleteStore';
import { Loader2 } from 'lucide-react';

interface DevUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  athlete_id?: string;
}

export default function DevLoginPage() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const { setSelectedAthleteId } = useAthleteStore();
  const [users, setUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/dev-users')
      .then(r => r.ok ? r.json() : [])
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (user: DevUser) => {
    setLoggingIn(user.id);
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error('Login fejlede');
      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      if (data.user.athleteId) {
        setSelectedAthleteId(data.user.athleteId);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Dev login failed:', err);
    } finally {
      setLoggingIn(null);
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'border-purple-500/30 bg-purple-500/10',
    coach: 'border-green-500/30 bg-green-500/10',
    athlete: 'border-blue-500/30 bg-blue-500/10',
  };

  return (
    <div data-testid="dev-login-page" className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Ratizon</h1>
          <p className="text-sm text-muted-foreground mt-1">Dev Login — Vælg bruger</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => handleLogin(user)}
                disabled={!!loggingIn}
                className={`w-full flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30 ${roleColors[user.role] || 'border-border'}`}
              >
                <div className="text-left">
                  <div className="font-medium text-foreground">{user.display_name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full border capitalize" style={{ borderColor: 'currentColor' }}>
                    {user.role}
                  </span>
                  {loggingIn === user.id && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
