"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useMounted } from "./hooks";
import { Spinner, Toaster } from "./ui";

const DemoControls = dynamic(() => import("./demo-controls").then((m) => m.DemoControls));

/**
 * Frame for the staff and owner pages. They run only in the browser (the mock
 * backend lives in this device's storage), so the server sends a quiet
 * loading frame and the page mounts after hydration.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  return (
    <div className="app-root min-h-dvh bg-cream text-charcoal">
      {mounted ? (
        <>
          <a
            href="#main"
            // Focus the content without touching the URL hash (the staff screen keeps its tab there).
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("main")?.focus();
            }}
            className="sr-only z-[70] rounded-pill bg-bottle px-4 py-2 font-semibold text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            Skip to content
          </a>
          {children}
          <Toaster />
          <DemoControls />
        </>
      ) : (
        <div role="status" className="grid min-h-dvh place-items-center text-muted">
          <span className="flex items-center gap-2">
            <Spinner /> Loading…
          </span>
        </div>
      )}
    </div>
  );
}
