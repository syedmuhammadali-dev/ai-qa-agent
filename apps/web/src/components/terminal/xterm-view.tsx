"use client";

import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

/** Renders real command output as it streams in from Firestore. `log` is the
 * full accumulated text so far — this component writes only the new suffix
 * on each update, so it behaves like a real terminal rather than re-drawing. */
export function XtermView({ log, className }: { log: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const writtenLengthRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const term = new Terminal({
      convertEol: true,
      disableStdin: true,
      fontSize: 12,
      theme: { background: "#00000000" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;
    writtenLengthRef.current = 0;

    const onResize = () => fit.fit();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      term.dispose();
      termRef.current = null;
    };
  }, []);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    if (log.length < writtenLengthRef.current) {
      // Log was reset (e.g. viewing a different run) — start clean.
      term.reset();
      writtenLengthRef.current = 0;
    }
    const newText = log.slice(writtenLengthRef.current);
    if (newText) {
      term.write(newText);
      writtenLengthRef.current = log.length;
    }
  }, [log]);

  return <div ref={containerRef} className={className} />;
}
