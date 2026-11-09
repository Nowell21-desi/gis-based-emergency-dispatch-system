import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { deletionApi, type DeletionRequest } from '@/services/api';
import { Button } from '@/components/ui/button';
import { formatManilaDateTime } from '@/lib/timezone';

/** Admin list of citizen account deletion requests, with process (anonymise) and dismiss actions. */
export function DeletionRequestsPanel() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['deletion-requests'],
    queryFn: () => deletionApi.list(accessToken!),
    enabled: !!accessToken,
  });
  const rows = (query.data?.data ?? []) as DeletionRequest[];

  async function act(kind: 'process' | 'dismiss', row: DeletionRequest) {
    const message =
      kind === 'process'
        ? `Anonymise ${row.full_name} (${row.email})? Their name, email, phone and address will be removed and sign-in disabled. This cannot be undone.`
        : `Dismiss the deletion request from ${row.full_name}? The account stays active.`;
    if (!window.confirm(message)) return;
    setBusyId(row.user_id);
    try {
      if (kind === 'process') await deletionApi.process(accessToken!, row.user_id);
      else await deletionApi.dismiss(accessToken!, row.user_id);
      toast.success(kind === 'process' ? 'Account anonymised' : 'Request dismissed');
      await queryClient.invalidateQueries({ queryKey: ['deletion-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['audit'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card overflow-hidden p-3 sm:p-4">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-300">Citizen deletion requests</h2>
      <p className="mb-3 text-xs text-ink-500">
        Processing removes the citizen&apos;s personal details and disables sign-in. Incident records are kept for reporting.
      </p>
      {query.isError && (
        <p className="mb-3 text-sm text-alert-400" role="alert">
          {query.error instanceof Error ? query.error.message : 'Could not load deletion requests'}
        </p>
      )}
      <ul className="max-h-[min(60vh,560px)] space-y-2 overflow-y-auto text-sm ops-scroll">
        {rows.map((row) => (
          <li key={row.user_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-800 py-2">
            <div className="min-w-0">
              <p className="font-medium text-ink-100">{row.full_name}</p>
              <p className="text-xs text-ink-400">
                {row.email} · {row.contact_number}
              </p>
              <p className="text-xs text-ink-500">Requested {formatManilaDateTime(row.deletion_requested_at)}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={busyId === row.user_id} onClick={() => void act('dismiss', row)}>
                Dismiss
              </Button>
              <Button type="button" size="sm" className="bg-alert-500 hover:brightness-110" disabled={busyId === row.user_id} onClick={() => void act('process', row)}>
                Process deletion
              </Button>
            </div>
          </li>
        ))}
        {!query.isLoading && rows.length === 0 && <li className="py-6 text-center text-ink-500">No pending deletion requests</li>}
      </ul>
    </div>
  );
}
