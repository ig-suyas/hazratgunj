"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { homeFor } from "@/components/app/auth";
import { Button, inputClass } from "@/components/app/ui";
import { Logo } from "@/components/logo";
import { demo } from "@/config/demo";
import { getCurrentUser, login } from "@/lib/api";
import { formatTime } from "@/lib/fmt";

const PIN_LENGTH = 8;

export type DemoLogin = { role: string; username: string; pin: string };

/**
 * Sign-in for staff and the owner: username and an 8-digit PIN, checked on the
 * server. The account decides where it goes. demoLogins comes from the server
 * page, only while demo.showDemoHint is on.
 */
export function LoginForm({ demoLogins }: { demoLogins?: DemoLogin[] }) {
  const router = useRouter();
  const id = useId();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pinRef = useRef<HTMLInputElement>(null);
  // Browsers without masked text fields fall back to a hidden-character field.
  const [canMask] = useState(() => CSS.supports("-webkit-text-security", "disc"));

  // Already signed in on this device: go straight to the right screen.
  useEffect(() => {
    getCurrentUser().then((u) => u && router.replace(homeFor(u.role)));
  }, [router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!username.trim()) return setMessage("Enter your username.");
    if (pin.length !== PIN_LENGTH) return setMessage(`Your PIN has ${PIN_LENGTH} digits.`);
    setBusy(true);
    setMessage(null);
    const r = await login(username, pin, new URLSearchParams(window.location.search).get("next") ?? undefined);
    if (r.ok) {
      router.replace(r.home);
      return;
    }
    setBusy(false);
    setPin("");
    pinRef.current?.focus();
    setMessage(
      r.code === "error"
        ? "Could not reach the server. Check the connection and try again."
        : r.code === "locked"
        ? `Too many tries. Please wait and try again after ${formatTime(r.until)}.`
        : `That username and PIN do not match.${r.attemptsLeft <= 3 ? ` ${r.attemptsLeft} ${r.attemptsLeft === 1 ? "try" : "tries"} left before a short lock.` : ""}`,
    );
  };

  return (
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-gutter py-10 focus:outline-none">
      <div className="flex flex-col items-center text-center">
        <Logo size={96} priority />
        <h1 className="mt-5 font-display text-title font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">For Hazratgunj staff</p>
      </div>
      <div className="hairline mt-6" />

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor={`${id}-user`} className="mb-1.5 block text-sm font-semibold">
            Username
          </label>
          <input
            id={`${id}-user`}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            placeholder={`e.g. ${demo.restaurantCode}.staff1`}
            className={`${inputClass} h-12`}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor={`${id}-pin`} className="text-sm font-semibold">
              PIN
            </label>
            <button type="button" onClick={() => setShowPin((s) => !s)} aria-pressed={showPin} className="min-h-9 px-1 text-sm font-semibold text-bottle">
              {showPin ? "Hide PIN" : "Show PIN"}
            </button>
          </div>
          {/* A text field with masked digits: no "save password" prompt, numeric keypad on phones. */}
          <input
            ref={pinRef}
            id={`${id}-pin`}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
            type={showPin || canMask ? "text" : "password"}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={PIN_LENGTH}
            autoComplete="off"
            aria-describedby={`${id}-pin-hint`}
            className={`${inputClass} h-12 text-lg tabular ${showPin ? "tracking-[0.3em]" : "app-pin"}`}
          />
          <p id={`${id}-pin-hint`} className="mt-1 text-sm text-muted">
            {PIN_LENGTH} digits
          </p>
        </div>

        {message && (
          <p role="alert" className="rounded-thumb border border-sand bg-paper px-3 py-2.5 text-sm font-semibold">
            {message}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" busy={busy} className="w-full">
          Sign in
        </Button>
      </form>

      {demo.showDemoHint && demoLogins && demoLogins.length > 0 && (
        <details className="mt-8 rounded-card border border-sand bg-paper px-4 py-3 text-sm">
          <summary className="min-h-9 cursor-pointer content-center font-semibold text-brass-ink">Demo access</summary>
          <ul className="mt-2 space-y-2">
            {demoLogins.map((d) => (
              <li key={d.username} className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-semibold">{d.role}</span>
                  <span className="block text-muted tabular">
                    {d.username} · {d.pin}
                  </span>
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    setUsername(d.username);
                    setPin(d.pin);
                    setMessage(null);
                  }}
                >
                  Use
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
