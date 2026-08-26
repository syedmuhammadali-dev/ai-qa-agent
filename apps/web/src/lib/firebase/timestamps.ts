import { Timestamp } from "firebase/firestore";

/**
 * Converts whatever shape a Firestore timestamp field actually arrives in
 * to millis, without ever throwing. In practice this has arrived as: a real
 * `Timestamp` instance, `null` (an unresolved `serverTimestamp()` write,
 * before the server round-trip completes), a plain `{seconds, nanoseconds}`
 * object (some tooling/exports write it this way), or a raw number (e.g.
 * data seeded directly via the Admin SDK with `Date.now()`). A field in an
 * unexpected shape should degrade to "now", never crash the whole snapshot
 * listener and leave the page stuck loading forever.
 */
export function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  ) {
    return (value as { seconds: number }).seconds * 1000;
  }
  return Date.now();
}
