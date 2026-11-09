import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Radio, Map, Bell, User, LogOut, MessageSquare, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useHealth } from '@/hooks/useHealth';
import { ImportantAlertHost } from '@/components/responder/ImportantAlertHost';
import { LiveSyncProvider } from '@/hooks/LiveSyncContext';
import { startResponderGpsTracking, stopResponderGpsTracking } from '@/lib/responderGps';
import { useDevice } from '@/hooks/useDevice';
import { useTheme } from '@/hooks/useTheme';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

function ResponderShell() {
  const { user, accessToken, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const health = useHealth();
  const { theme, toggle } = useTheme();
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    startResponderGpsTracking(accessToken);
    return () => stopResponderGpsTracking();
  }, [accessToken]);

  const nav = [
    { to: '.', icon: Radio, label: 'Jobs', end: true },
    { to: 'map', icon: Map, label: 'Map', end: false },
    { to: 'chat', icon: MessageSquare, label: 'Chat', end: false },
    { to: 'notifications', icon: Bell, label: 'Alerts', end: false },
    { to: 'profile', icon: User, label: 'Profile', end: false },
  ];

  function logout() {
    setConfirmLogout(false);
    clearAuth();
    navigate('/login');
  }

  const connectionLabel =
    health.isError || health.data?.status === 'down'
      ? 'Offline'
      : !navigator.onLine
        ? 'Offline'
        : health.data?.status === 'degraded'
          ? 'Limited connectivity'
          : 'Connected';

  const device = useDevice();

  return (
    <>
      <div
        className={clsx(
          'citizen-shell mx-auto flex w-full flex-col bg-navy-950',
          device === 'web' ? 'citizen-shell--web' : 'citizen-shell--mobile',
          device === 'ios' && 'citizen-shell--ios',
          device === 'android' && 'citizen-shell--android'
        )}
        data-device={device}
      >
        <header className="citizen-header shrink-0 border-b border-navy-700 bg-navy-900 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-500">Responder field</p>
              <h1 className="truncate text-lg font-bold">{user?.fullName}</h1>
              <p className="truncate text-sm text-ink-400">Emergency responder — Brigada Onse</p>
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="shrink-0 rounded-md p-2 text-ink-400 hover:text-ink-50"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
          <p
            className={clsx(
              'mt-2 font-mono text-[11px]',
              connectionLabel === 'Offline'
                ? 'text-alert-400'
                : connectionLabel === 'Limited connectivity'
                  ? 'text-gold-400'
                  : 'text-ok-400'
            )}
            role="status"
            aria-live="polite"
          >
            {connectionLabel}
          </p>
        </header>

        <main className="citizen-main min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
          <Outlet />
        </main>

        <ImportantAlertHost />

        <nav
          className={clsx(
            'citizen-bottom-nav fixed bottom-0 z-50 w-full border-t border-navy-700 bg-navy-900',
            device === 'web'
              ? 'left-0 right-0 max-w-full'
              : 'left-0 right-0 max-w-full pb-[env(safe-area-inset-bottom)]'
          )}
          aria-label="Responder navigation"
        >
          <div className="flex justify-around px-1 pt-1">
            {nav.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={label}
                to={to}
                end={end}
                aria-label={label}
                className={({ isActive }) =>
                  clsx(
                    'flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px]',
                    isActive ? 'font-medium text-gold-500' : 'text-ink-400'
                  )
                }
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              aria-label="Sign out"
              className="flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] text-ink-400"
            >
              <LogOut className="h-6 w-6" aria-hidden="true" />
              Log out
            </button>
          </div>
        </nav>
      </div>

      {confirmLogout && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-navy-700 bg-navy-900 p-6 shadow-xl">
            <p className="text-base font-semibold text-ink-50">Log out?</p>
            <p className="mt-1 text-sm text-ink-400">Are you sure you want to log out?</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-lg border border-navy-600 bg-navy-800 py-3 text-sm font-medium text-ink-100 hover:bg-navy-700"
                onClick={() => setConfirmLogout(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-alert-500 py-3 text-sm font-medium text-white hover:bg-alert-400"
                onClick={logout}
              >
                Log out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function ResponderLayout() {
  return (
    <LiveSyncProvider>
      <ResponderShell />
    </LiveSyncProvider>
  );
}
