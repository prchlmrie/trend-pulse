import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, registerUser, setAccessToken } from '../api/client';
import { formatPHP } from '../utils/formatters';
import './LoginPage.css';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80';

const BUDGET_PRESETS = [0, 5000, 10000, 15000, 25000, 50000, 100000];

export function LoginPage() {
  const navigate = useNavigate();
  const errId = useId();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [budget, setBudget] = useState(15000);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError(null);
    setConfirmPassword('');
  };

  const authMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const uname = username.trim().toLowerCase();
      if (mode === 'login') {
        const r = await login(uname, password);
        setAccessToken(r.access_token);
        return r;
      }
      const r = await registerUser({
        username: uname,
        password,
        name: name.trim() || undefined,
        budget: Math.max(0, Math.round(Number(budget) || 0)),
      });
      setAccessToken(r.access_token);
      return r;
    },
    onSuccess: () => navigate('/dashboard'),
    onError: (e: Error) => setError(e.message || 'Something went wrong. Please try again.'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const uname = username.trim().toLowerCase();
    if (!uname || !password) {
      setError('Please enter your username and password.');
      return;
    }
    if (mode === 'register') {
      if (uname.length < 2) {
        setError('Username must be at least 2 characters.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Check both fields.');
        return;
      }
      if (Number.isNaN(Number(budget)) || Number(budget) < 0) {
        setError('Starting budget must be zero or a positive amount.');
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

  const inputClass = 'login-input';

  return (
    <main className="login-page min-h-screen flex flex-col md:flex-row overflow-hidden bg-surface font-body">
      <section className="login-hero hidden md:flex w-1/2 relative items-center justify-center overflow-hidden bg-[#15261f]">
        <div className="absolute inset-0">
          <img alt="" className="h-full w-full object-cover scale-105 blur-[2px]" src={HERO_IMAGE} loading="eager" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1c16]/95 via-[#1a3d2e]/82 to-[#0a1410]/93" />
        <div className="relative z-10 p-16 max-w-xl">
          <div className="mb-12">
            <span className="login-hero-kicker">For resellers</span>
            <h2 className="login-hero-title">Find products worth selling next.</h2>
            <p className="login-hero-lead">
              TrendPulse spots rising items and shows you what to buy — and what to skip — using live market signals.
            </p>
          </div>
          <div className="login-hero-live">
            <div className="login-live-dot" aria-hidden />
            <p>We check thousands of product signals for you every day.</p>
          </div>
        </div>
      </section>

      <section className="login-form-section flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="w-full max-w-[420px]">
          <div className="login-mobile-pulse md:hidden">
            <div className="login-live-dot login-live-dot--sm" aria-hidden />
            <p>Live signals updated daily — sign in to see your picks.</p>
          </div>

          <div className="login-brand">
            <div className="login-brand-icon">
              <span className="material-symbols-outlined text-xl text-white">storefront</span>
            </div>
            <span className="login-brand-name">TrendPulse</span>
          </div>

          <div className="login-mode-tabs" role="tablist" aria-label="Sign in or create account">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`login-mode-tab ${mode === 'login' ? 'login-mode-tab--on' : ''}`}
              onClick={() => switchMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`login-mode-tab ${mode === 'register' ? 'login-mode-tab--on' : ''}`}
              onClick={() => switchMode('register')}
            >
              Create account
            </button>
          </div>

          <h1 className="login-heading">{mode === 'login' ? 'Welcome back' : 'Start selling smarter'}</h1>
          <p className="login-subheading">
            {mode === 'login'
              ? 'Enter your username and password to open your dashboard.'
              : 'Set up your shop profile and how much you can spend on stock.'}
          </p>

          <form className="login-form" onSubmit={onSubmit} noValidate>
            {mode === 'register' && (
              <div className="login-field">
                <label className="login-label" htmlFor="display-name">
                  Your name <span className="login-optional">(optional)</span>
                </label>
                <input
                  id="display-name"
                  type="text"
                  autoComplete="name"
                  className={inputClass}
                  placeholder="e.g. Mara Reyes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={authMutation.isPending}
                />
              </div>
            )}

            <div className="login-field">
              <label className="login-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                name="username"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={inputClass}
                placeholder="e.g. myshop_ph"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={authMutation.isPending}
              />
              <p className="login-hint">Letters and numbers only. We use this to sign you in.</p>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">
                Password
              </label>
              <div className="login-password-wrap">
                <input
                  id="password"
                  name="password"
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={`${inputClass} login-input--password`}
                  placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authMutation.isPending}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setPasswordVisible((v) => !v)}
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-xl">
                    {passwordVisible ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div className="login-field">
                  <label className="login-label" htmlFor="confirm-password">
                    Confirm password
                  </label>
                  <div className="login-password-wrap">
                    <input
                      id="confirm-password"
                      type={confirmVisible ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      className={`${inputClass} login-input--password`}
                      placeholder="Type your password again"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={authMutation.isPending}
                    />
                    <button
                      type="button"
                      className="login-eye-btn"
                      onClick={() => setConfirmVisible((v) => !v)}
                      aria-label={confirmVisible ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {confirmVisible ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="login-field login-budget-block">
                  <label className="login-label" htmlFor="startup-budget">
                    Starting budget
                  </label>
                  <p className="login-hint login-hint--tight">
                    How much money can you use to buy inventory? Pick a shortcut or type any amount (₱0 is fine).
                  </p>
                  <div className="login-budget-presets" role="group" aria-label="Budget shortcuts">
                    {BUDGET_PRESETS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        className={`login-budget-chip ${budget === amount ? 'login-budget-chip--on' : ''}`}
                        onClick={() => setBudget(amount)}
                        disabled={authMutation.isPending}
                      >
                        {amount === 0 ? '₱0' : formatPHP(amount, false)}
                      </button>
                    ))}
                  </div>
                  <div className="login-budget-input-row">
                    <span className="login-budget-currency" aria-hidden>
                      ₱
                    </span>
                    <input
                      id="startup-budget"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={500}
                      className={inputClass}
                      value={budget}
                      onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                      disabled={authMutation.isPending}
                      aria-describedby="budget-hint"
                    />
                  </div>
                  <p id="budget-hint" className="login-hint font-tabular">
                    Profit Finder will use <strong>{formatPHP(budget, false)}</strong> as your starting capital. You
                    can change this anytime.
                  </p>
                </div>
              </>
            )}

            {mode === 'login' && (
              <div className="login-remember">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="login-checkbox"
                />
                <label htmlFor="remember">Keep me signed in on this device</label>
              </div>
            )}

            {error && (
              <p id={errId} className="login-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={authMutation.isPending} className="login-submit">
              {authMutation.isPending
                ? mode === 'login'
                  ? 'Signing in…'
                  : 'Creating your account…'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          <p className="login-footer-note">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <button type="button" className="login-text-btn" onClick={() => switchMode('register')}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className="login-text-btn" onClick={() => switchMode('login')}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <footer className="login-page-footer">© 2026 TrendPulse</footer>
      </section>
    </main>
  );
}
