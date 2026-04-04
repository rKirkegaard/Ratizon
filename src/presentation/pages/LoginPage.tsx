export default function LoginPage() {
  return (
    <div data-testid="login-page" className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8">
        <h1 className="text-2xl font-bold text-center">Log ind</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">E-mail</label>
            <input
              type="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="din@email.dk"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Adgangskode</label>
            <input
              type="password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Adgangskode"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Log ind
          </button>
        </form>
      </div>
    </div>
  );
}
