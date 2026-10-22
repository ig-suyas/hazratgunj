"use client";

import { useState } from "react";
import { DishForm } from "@/components/app/dish-form";
import { useLive } from "@/components/app/hooks";
import { Badge, Button, Card, Empty, ErrorState, Loading, errorText, toast } from "@/components/app/ui";
import { getMenu, listSuggestions, suggestDish, type Suggestion } from "@/lib/api";
import { formatDateTime, money } from "@/lib/fmt";

export const SUGGESTION_BADGE: Record<Suggestion["status"], { tone: "brass" | "green" | "brown"; label: string }> = {
  pending: { tone: "brass", label: "Pending" },
  approved: { tone: "green", label: "Approved" },
  rejected: { tone: "brown", label: "Not approved" },
};

/** Staff suggest a new dish; the owner approves it before it goes on the menu. */
export function SuggestDish() {
  const menu = useLive(getMenu, "menu", ["menu"]);
  const mine = useLive(listSuggestions, "suggestions", ["suggestions"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Suggest a new dish</h2>
        <p className="mb-4 text-sm text-muted">The owner reviews it. Once approved, it goes on the menu.</p>
        {!menu.data ? (
          <Loading rows={2} />
        ) : (
          <DishForm
            key={formKey}
            categories={menu.data.categories}
            onSubmit={async (d) => {
              setBusy(true);
              setError(null);
              try {
                await suggestDish(d);
                toast("Suggestion sent for approval");
                setFormKey((k) => k + 1);
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
            footer={() => (
              <>
                {error && (
                  <p role="alert" className="text-sm font-semibold text-nonveg">
                    {error}
                  </p>
                )}
                <Button type="submit" variant="primary" size="lg" busy={busy} className="w-full">
                  Send for approval
                </Button>
              </>
            )}
          />
        )}
      </Card>

      <section aria-labelledby="my-suggestions">
        <h2 id="my-suggestions" className="mb-3 text-lg font-semibold">
          Your suggestions
        </h2>
        {mine.error && !mine.data ? (
          <ErrorState error={mine.error} onRetry={mine.reload} />
        ) : !mine.data ? (
          <Loading rows={2} />
        ) : mine.data.length === 0 ? (
          <Empty title="No suggestions yet" />
        ) : (
          <ul className="space-y-3">
            {mine.data.map((s) => (
              <li key={s.id} className="rounded-card border border-sand bg-paper p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{s.name}</p>
                    <p className="text-sm text-muted">
                      {s.veg ? "Veg" : "Non-veg"} · <span className="tabular">{money(s.price)}</span> · {formatDateTime(s.suggestedAt)}
                    </p>
                  </div>
                  <Badge tone={SUGGESTION_BADGE[s.status].tone}>{SUGGESTION_BADGE[s.status].label}</Badge>
                </div>
                {s.reason && <p className="mt-2 text-sm">Owner&apos;s note: {s.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
