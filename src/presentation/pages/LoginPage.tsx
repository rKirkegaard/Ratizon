import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin, useRegister } from '@/application/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await registerMutation.mutateAsync({ email, password, firstName, lastName });
      } else {
        await loginMutation.mutateAsync({ email, password });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Noget gik galt');
    }
  };

  return (
    <div data-testid="login-page" className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Ratizon</h1>
          <p className="text-sm text-muted-foreground mt-1">Din AI-drevne træningscoach</p>
        </div>

        <div className="bg-card border border-border/50 rounded-lg p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">{isRegister ? 'Opret konto' : 'Log ind'}</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-md p-3 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Fornavn</label>
                  <input data-testid="register-firstname" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full bg-muted/30 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Efternavn</label>
                  <input data-testid="register-lastname" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full bg-muted/30 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Email</label>
              <input data-testid="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="din@email.dk" className="w-full bg-muted/30 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Adgangskode</label>
              <input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="w-full bg-muted/30 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <button data-testid="login-submit" type="submit" disabled={isPending} className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRegister ? 'Opret konto' : 'Log ind'}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {isRegister ? 'Har du allerede en konto? Log ind' : 'Ingen konto? Opret en'}
            </button>
            <div>
              <button
                data-testid="dev-login-link"
                onClick={() => navigate('/dev-login')}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                Dev Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
