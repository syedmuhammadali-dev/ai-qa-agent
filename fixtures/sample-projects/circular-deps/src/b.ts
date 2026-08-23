// Fixture only — deliberately imports a.ts, closing the cycle with a.ts -> b.ts -> a.ts.
import { a } from "./a";

export function b() {
  return typeof a;
}
