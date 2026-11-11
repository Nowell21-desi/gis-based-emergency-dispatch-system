import { useQuery } from '@tanstack/react-query';
import { incidentsApi } from '@/services/api';

const PRIORITIES = ['Critical', 'High', 'Moderate', 'Low'];

const STATUS_FLOW = [
  'Reported',
  'Verified',
  'Dispatched',
  'En Route',
  'On Scene',
  'Resolved',
  'Closed',
];

/** Read-only view of the incident setup used by Dispatch: types, priorities and the status flow. */
export function IncidentSettingsPanel({ token }: { token: string | null }) {
  const typesQuery = useQuery({
    queryKey: ['incident-types'],
    queryFn: () => incidentsApi.types(token!),
    enabled: !!token,
  });
  const types = typesQuery.data?.data ?? [];

  return (
    <div className="card overflow-hidden p-3 sm:p-4">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-300">Incident Settings</h2>
      <p className="mb-4 text-sm text-ink-400">
        The incident setup used by Dispatch. This view is read-only; changes to incident types are made through the database migrations.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Incident types ({types.length})</h3>
          {typesQuery.isLoading && <p className="text-sm text-ink-500">Loading incident types…</p>}
          {typesQuery.isError && (
            <p className="text-sm text-alert-400" role="alert">
              Could not load incident types.
            </p>
          )}
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {types.map((t) => (
              <li key={t._id} className="rounded-md border border-navy-800 bg-navy-950/40 px-3 py-2 text-sm text-ink-200">
                {t.typeName}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-5">
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Priority levels</h3>
            <ul className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <li key={p} className="rounded-md border border-navy-800 bg-navy-950/40 px-3 py-2 text-sm font-medium text-ink-100">
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Status flow</h3>
            <p className="text-sm text-ink-300">{STATUS_FLOW.join(' → ')}</p>
            <p className="mt-1 text-xs text-ink-500">
              Cancelled and False Alarm can be set at any open stage. Reopen returns a closed incident to the flow.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
