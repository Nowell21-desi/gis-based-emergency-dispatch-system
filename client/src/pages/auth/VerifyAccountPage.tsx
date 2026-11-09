import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi, healthApi } from '@/services/api';
import { useAuthStore, getRoleHomePath } from '@/store/authStore';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const RESEND_SECONDS = 60;

type VerifyState = {
  email?: string;
  channel?: 'sms' | 'email';
  destination?: string;
  delivered?: boolean;
  devCode?: string;
};

export function VerifyAccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const state = (location.state ?? {}) as VerifyState;
  const email = state.email ?? new URLSearchParams(location.search).get('email') ?? '';

  const [code, setCode] = useState('');
  const [destination, setDestination] = useState(state.destination ?? '');
  const [channel, setChannel] = useState<'sms' | 'email'>(state.channel ?? 'email');
  const [devCode, setDevCode] = useState(state.devCode ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [smsEnabled, setSmsEnabled] = useState(false);

  useEffect(() => {
    healthApi
      .check()
      .then((res) => setSmsEnabled(Boolean(res.otpSmsEnabled)))
      .catch(() => setSmsEnabled(false));
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  if (!email) return <Navigate to={ROUTES.REGISTER} replace />;

  async function sendCode(nextChannel: 'sms' | 'email') {
    if (busy || cooldown > 0) return;
    setError('');
    setBusy(true);
    try {
      const res = await authApi.sendOtp(email, nextChannel);
      setChannel(nextChannel);
      if (res.data) {
        setDestination(res.data.destination);
        setDevCode(res.data.devCode ?? '');
        if (!res.data.delivered) {
          toast.message('Code queued. If it does not arrive, try the other option.');
        } else {
          toast.success('A new code was sent');
        }
      } else {
        toast.success(res.message);
      }
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send a code';
      setError(message);
      const wait = /wait (\d+) seconds/.exec(message);
      if (wait) setCooldown(Number(wait[1]));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const res = await authApi.verifyOtp(email, code);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      toast.success('Account verified');
      navigate(getRoleHomePath(res.data.user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  const hasCode = Boolean(destination);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Brigada Onse SVFAR" className="mx-auto h-16 w-16 object-contain" />
          <h1 className="mt-3 text-2xl font-bold">Verify your account</h1>
          <p className="mt-1 text-sm text-ink-400">
            {hasCode
              ? `Enter the 6-digit code sent to ${destination}.`
              : 'Send a 6-digit code to confirm your account before you sign in.'}
          </p>
        </div>

        <Card>
          <CardContent className="space-y-5 p-8">
            {error && (
              <div className="rounded-md border border-alert-500/40 bg-alert-500/10 px-4 py-3 text-sm text-alert-400" role="alert">
                {error}
              </div>
            )}

            {devCode && (
              <div className="rounded-md border border-gold-600/40 bg-gold-500/10 px-4 py-2 text-xs text-gold-300">
                Test mode code: <span className="font-mono text-sm">{devCode}</span>
              </div>
            )}

            {hasCode && (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    name="one-time-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center font-mono text-lg tracking-[0.4em]"
                  />
                </div>
                <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
                  {busy ? 'Verifying…' : 'Verify and continue'}
                </Button>
              </form>
            )}

            <div className="space-y-2">
              <p className="text-sm text-ink-300">{hasCode ? 'Did not get the code?' : 'Choose how to receive your code:'}</p>
              <div className="grid grid-cols-2 gap-2">
                {smsEnabled && (
                  <Button type="button" variant="outline" disabled={busy || cooldown > 0} onClick={() => void sendCode('sms')}>
                    {channel === 'sms' && hasCode ? 'Resend by SMS' : 'Send by SMS'}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className={smsEnabled ? undefined : 'col-span-2'}
                  disabled={busy || cooldown > 0}
                  onClick={() => void sendCode('email')}
                >
                  {channel === 'email' && hasCode ? 'Resend by email' : 'Send by email'}
                </Button>
              </div>
              {cooldown > 0 && <p className="text-xs text-ink-500">You can request another code in {cooldown}s.</p>}
            </div>

            <p className="text-center text-sm text-ink-400">
              <Link to={ROUTES.LOGIN} className="font-medium text-gold-500 hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
