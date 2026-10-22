"use client";

import { useId, useState } from "react";
import { useUser } from "@/components/app/auth";
import { useLive } from "@/components/app/hooks";
import { Badge, Button, ConfirmDialog, Dialog, ErrorState, Loading, PageHeader, errorText, inputClass, toast } from "@/components/app/ui";
import { addStaff, listStaff, removeStaff, resetStaffPin, type Account } from "@/lib/api";
import { dayLabel, dayKey } from "@/lib/fmt";

/** Staff accounts. A new or reset PIN is shown once, then never again. */
export function StaffPage() {
  const me = useUser();
  const list = useLive(listStaff, "staff", ["staff"]);
  const [adding, setAdding] = useState(false);
  const [reveal, setReveal] = useState<{ title: string; username: string; pin: string } | null>(null);
  const [reset, setReset] = useState<Account | null>(null);
  const [remove, setRemove] = useState<Account | null>(null);

  return (
    <>
      <PageHeader
        title="Staff"
        description="Each person signs in with their own username and 8-digit PIN."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            Add staff
          </Button>
        }
      />
      {list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading rows={3} />
      ) : (
        <ul className="divide-y divide-sand rounded-card border border-sand bg-paper">
          {list.data.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-lg font-semibold">
                  {a.name}
                  {a.role === "owner" && <Badge tone="brass">Owner</Badge>}
                  {a.id === me.id && <span className="text-sm font-normal text-muted">(you)</span>}
                </p>
                <p className="text-sm text-muted tabular">
                  {a.username} · since {dayLabel(dayKey(a.createdAt))}
                </p>
              </div>
              {a.role !== "owner" && (
                <>
                  <Button size="sm" onClick={() => setReset(a)}>
                    Reset PIN
                  </Button>
                  <Button size="sm" variant="ghost" className="text-nonveg" onClick={() => setRemove(a)}>
                    Remove
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add staff" description="The username is made for you. You will see the PIN once.">
        {adding && (
          <AddForm
            onDone={(r) => {
              setAdding(false);
              if (r) setReveal({ title: `${r.account.name} can now sign in`, username: r.account.username, pin: r.pin });
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={!!reveal}
        onClose={() => setReveal(null)}
        title={reveal?.title ?? ""}
        description="Write this down or tell them now. The PIN is not shown again."
        footer={
          <Button variant="primary" onClick={() => setReveal(null)}>
            Done
          </Button>
        }
      >
        {reveal && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-card border border-brass bg-cream px-5 py-4">
            <dt className="text-muted">Username</dt>
            <dd className="text-lg font-semibold tabular">{reveal.username}</dd>
            <dt className="text-muted">PIN</dt>
            <dd className="text-2xl font-semibold tracking-[0.2em] tabular">{reveal.pin}</dd>
          </dl>
        )}
      </Dialog>
      <ConfirmDialog
        open={!!reset}
        onClose={() => setReset(null)}
        title={reset ? `Reset ${reset.name}'s PIN?` : "Reset PIN"}
        description="The old PIN stops working at once."
        confirmLabel="Reset PIN"
        onConfirm={async () => {
          if (!reset) return;
          const pin = await resetStaffPin(reset.id);
          setReveal({ title: `New PIN for ${reset.name}`, username: reset.username, pin });
        }}
      />
      <ConfirmDialog
        open={!!remove}
        onClose={() => setRemove(null)}
        title={remove ? `Remove ${remove.name}?` : "Remove staff"}
        description="They can no longer sign in. Their past actions stay in the records."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={async () => {
          if (!remove) return;
          await removeStaff(remove.id);
          toast(`${remove.name} removed`);
        }}
      />
    </>
  );
}

function AddForm({ onDone }: { onDone: (r: Awaited<ReturnType<typeof addStaff>> | null) => void }) {
  const id = useId();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          onDone(await addStaff(name));
        } catch (err) {
          setError(errorText(err));
          setBusy(false);
        }
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
          Full name
        </label>
        <input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputClass} />
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-nonveg">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-sand pt-4">
        <Button variant="ghost" onClick={() => onDone(null)} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" busy={busy}>
          Add and show PIN
        </Button>
      </div>
    </form>
  );
}
