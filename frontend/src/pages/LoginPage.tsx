import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, registerUser, setAccessToken } from '../api/client';

/** Relatable retail / shelf aesthetic (Unsplash). */
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80';

/**
 * TrendPulse — reseller-first entry
 * Headlines: Plus Jakarta Sans (font-headline); body: Inter (font-body).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (mode === 'login') {
        const r = await login(username.trim(), password);
        setAccessToken(r.access_token);
        return r;
      }
      const r = await registerUser({
        username: username.trim(),
        password,
        name: name.trim() || undefined,
        budget: 15000,
      });
      setAccessToken(r.access_token);
      return r;
    },
    onSuccess: () => navigate('/dashboard'),
    onError: (e: Error) => setError(e.message || 'Authentication failed'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Store name or username and password are required.');
      return;
    }
    const u = username.trim();
    if (mode === 'register') {
      if (u.length < 2) {
        setError('Username must be at least 2 characters.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }
    if (remember) {
      try {
        localStorage.setItem('trendpulse_remember_session', '1');
      } catch {
        /* ignore */
      }
    } else {
      try {
        localStorage.removeItem('trendpulse_remember_session');
      } catch {
        /* ignore */
      }
    }
    authMutation.mutate();
  };

  const inputClass =
    'w-full px-6 py-[1.125rem] rounded-xl bg-surface-container-high border-none ring-0 ' +
    'focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:bg-surface-container-highest ' +
    'transition-all duration-200 text-on-surface font-body';

  const pulseCopy = 'Pulse: 4,000+ local inventory items analyzed today.';

  return (
    <main className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-surface font-body selection:bg-secondary-container selection:text-on-surface">
      {/* LEFT: forest-toned hero (desktop) */}
      <section className="hidden md:flex w-1/2 relative items-center justify-center overflow-hidden bg-[#15261f]">
        <div className="absolute inset-0">
          <img
            alt=""
            className="h-full w-full object-cover scale-105 blur-[2px]"
            src={HERO_IMAGE}
            loading="eager"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1c16]/95 via-[#1a3d2e]/82 to-[#0a1410]/93" />
        <div className="relative z-10 p-16 max-w-xl">
          <div className="mb-12">
            <span className="text-secondary-container tracking-[0.18em] text-xs font-bold uppercase mb-4 block font-body">
              For resellers
            </span>
            <h2 className="text-white font-headline text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight">
              Start your next winning inventory.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/85 font-body max-w-md">
              Join 1,200+ resellers identifying high-profit trends in real-time.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-white/10 p-6 backdrop-blur-xl ring-1 ring-white/15">
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-secondary" />
            </div>
            <p className="text-sm font-medium text-white/90 font-body leading-snug">{pulseCopy}</p>
          </div>
        </div>
      </section>

      {/* RIGHT: Form */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 pb-20 sm:py-20 md:px-20 lg:px-32 md:py-16">
        <div className="w-full max-w-md">
          <div className="mb-12 md:hidden flex items-start gap-3 rounded-xl bg-secondary-container/40 p-4 ring-1 ring-secondary/15">
            <div className="relative mt-0.5 flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary" />
            </div>
            <p className="text-xs font-semibold leading-relaxed text-on-background font-body">{pulseCopy}</p>
          </div>

          <div className="mb-12">
            <div className="mb-10 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-on-background">
                <span className="material-symbols-outlined text-xl text-white">storefront</span>
              </div>
              <span className="font-headline text-xl font-black tracking-tighter text-on-background">TrendPulse</span>
            </div>
            <h1 className="mb-4 font-headline text-4xl font-extrabold tracking-tight text-on-background">
              {mode === 'login' ? 'Sign in' : 'Create your account'}
            </h1>
            <p className="mb-10 text-base leading-relaxed text-on-surface-variant/90 font-body">
              {mode === 'login'
                ? 'Use your store name or username to sync budgets, saved picks, and alerts.'
                : 'Set up a merchant account to run the pipeline, explore trends, and track capital.'}
            </p>
          </div>

          <form className="space-y-7" onSubmit={onSubmit}>
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="ml-1 block text-sm font-semibold text-on-surface/70 font-body" htmlFor="display-name">
                  Display name
                </label>
                <input
                  id="display-name"
                  type="text"
                  autoComplete="name"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={authMutation.isPending}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="ml-1 block text-sm font-semibold text-on-surface/70 font-body" htmlFor="username">
                Store name or username
              </label>
              <input
                id="username"
                type="text"
                name="username"
                required
                autoComplete="username"
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={authMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="block text-sm font-semibold text-on-surface/70 font-body" htmlFor="password">
                  Password
                </label>
                <span
                  className="cursor-default text-xs font-bold text-secondary opacity-50 font-body"
                  title="Coming soon"
                >
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={`${inputClass} pr-14`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authMutation.isPending}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 transition-colors hover:text-on-surface"
                  onClick={() => setPasswordVisible((v) => !v)}
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {passwordVisible ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-5 w-5 shrink-0 rounded-md border-none bg-surface-container-high text-secondary accent-secondary focus:ring-2 focus:ring-secondary/20"
              />
              <label htmlFor="remember" className="text-sm font-medium text-on-surface-variant font-body">
                Keep me signed in on this device
              </label>
            </div>

            {error && (
              <p className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-body ring-1 ring-error/15">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={authMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-5 font-headline font-bold text-white shadow-[0_16px_40px_-12px_rgba(4,120,87,0.45)] transition-all duration-300 hover:brightness-105 active:scale-[0.99] disabled:opacity-70 disabled:hover:scale-100"
            >
              {authMutation.isPending
                ? mode === 'login'
                  ? 'Signing in…'
                  : 'Creating account…'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          <div className="mt-14 pt-10 pb-8 text-center ring-1 ring-on-surface/5 ring-inset rounded-2xl bg-surface-container-high/30 px-5">
            <p className="text-sm text-on-surface-variant font-body">
              {mode === 'login' ? (
                <>
                  New here?{' '}
                  <button
                    type="button"
                    className="font-bold text-on-background transition-colors hover:text-secondary bg-transparent border-0 p-0 cursor-pointer font-body underline-offset-2 hover:underline"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already selling with us?{' '}
                  <button
                    type="button"
                    className="font-bold text-on-background transition-colors hover:text-secondary bg-transparent border-0 p-0 cursor-pointer font-body underline-offset-2 hover:underline"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        <footer className="mt-20 w-full max-w-md">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 font-body">
            <span>© 2026 TrendPulse</span>
            <div className="flex gap-4">
              <span className="cursor-default opacity-70">Privacy</span>
              <span className="cursor-default opacity-70">Security</span>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
