// Fixture only — deliberately imports b.ts, which imports back to this file.
import { b } from "./b";

export function a() {
  return b();
}
