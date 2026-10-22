"use client";

import { useId, useState } from "react";
import { DishForm } from "@/components/app/dish-form";
import { useLive } from "@/components/app/hooks";
import { Badge, Button, Dialog, Empty, ErrorState, Loading, PageHeader, errorText, textareaClass, toast } from "@/components/app/ui";
import { DietMark } from "@/components/diet-mark";
import { SUGGESTION_BADGE } from "@/components/staff/suggest";
import { getMenu, listSuggestions, reviewSuggestion, type Suggestion } from "@/lib/api";
import { formatDateTime, money } from "@/lib/fmt";

/** Staff-suggested dishes. Approving puts the dish on the menu at once. */
export function Approvals() {
  const list = useLive(listSuggestions, "suggestions", ["suggestions"]);
  const menu = useLive(getMenu, "menu", ["menu"]);
  const [review, setReview] = useState<Suggestion | null>(null);
  const [reject, setReject] = useState<Suggestion | null>(null);
  const cats = new Map(menu.data?.categories.map((c) => [c.id, c.tab]));

  if (list.error && !list.data) return <ErrorState error={list.error} onRetry={list.reload} />;
  const pending = list.data?.filter((s) => s.status === "pending") ?? [];
  const done = list.data?.filter((s) => s.status !== "pending") ?? [];

  const row = (s: Suggestion) => (
    <li key={s.id} className="rounded-card border border-sand bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <DietMark veg={s.veg} />
            {s.name}
          </p>
          <p className="text-sm text-muted">
            {cats.get(s.category) ?? s.category} · <span className="font-semibold text-charcoal tabular">{money(s.price)}</span>
          </p>
        </div>
        <Badge tone={SUGGESTION_BADGE[s.status].tone}>{SUGGESTION_BADGE[s.status].label}</Badge>
      </div>
      {s.description && <p className="mt-2">{s.description}</p>}
      <p className="mt-2 text-sm text-muted">
        Suggested by {s.suggestedBy} · {formatDateTime(s.suggestedAt)}
        {s.reviewedAt && ` · reviewed by ${s.reviewedBy}, ${formatDateTime(s.reviewedAt)}`}
      </p>
      {s.reason && <p className="mt-1 text-sm">Reason: {s.reason}</p>}
      {s.status === "pending" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setReview(s)}>
            Review and approve
          </Button>
          <Button variant="danger" onClick={() => setReject(s)}>
            Reject
          </Button>
        </div>
      )}
    </li>
  );

  return (
    <>
      <PageHeader title="Approvals" description="Dishes suggested by staff. Edit any detail before approving." />
      {!list.data ? (
        <Loading rows={3} />
      ) : (
        <>
          <section aria-labelledby="pending-h">
            <h2 id="pending-h" className="mb-3 text-lg font-semibold">
              Waiting for you <span className="text-muted tabular">· {pending.length}</span>
            </h2>
            {pending.length === 0 ? <Empty title="Nothing to review">New suggestions from staff appear here.</Empty> : <ul className="space-y-3">{pending.map(row)}</ul>}
          </section>
          {done.length > 0 && (
            <section aria-labelledby="done-h" className="mt-8">
              <h2 id="done-h" className="mb-3 text-lg font-semibold">
                Reviewed
              </h2>
              <ul className="space-y-3">{done.map(row)}</ul>
            </section>
          )}
        </>
      )}

      <Dialog open={!!review} onClose={() => setReview(null)} title="Review the dish" description="Approving adds it to the guest menu straight away." wide>
        {review && menu.data && (
          <DishForm
            key={review.id}
            categories={menu.data.categories}
            initial={review}
            showPhoto={false}
            onSubmit={async (d) => {
              try {
                await reviewSuggestion(review.id, { approve: true, edits: d });
                toast(`${d.name} approved and live on the menu`);
                setReview(null);
              } catch (e) {
                toast(errorText(e));
              }
            }}
            footer={() => (
              <div className="flex justify-end gap-2 border-t border-sand pt-4">
                <Button variant="ghost" onClick={() => setReview(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Approve
                </Button>
              </div>
            )}
          />
        )}
      </Dialog>
      <Dialog open={!!reject} onClose={() => setReject(null)} title={reject ? `Reject ${reject.name}?` : "Reject"} description="The staff member sees your reason.">
        {reject && <RejectForm key={reject.id} s={reject} onDone={() => setReject(null)} />}
      </Dialog>
    </>
  );
}

function RejectForm({ s, onDone }: { s: Suggestion; onDone: () => void }) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
          Reason <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id={id} rows={2} maxLength={150} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} />
      </div>
      <div className="flex justify-end gap-2 border-t border-sand pt-4">
        <Button variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="danger"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await reviewSuggestion(s.id, { approve: false, reason });
              toast(`${s.name} rejected`);
              onDone();
            } catch (e) {
              toast(errorText(e));
              setBusy(false);
            }
          }}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
