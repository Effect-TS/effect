import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { fromEffect } from "./fromEffect"

/**
 * Lifts a synchronous side-effect into a `Managed[R, E, A]`,
 * translating any thrown exceptions into typed failed effects using onThrow.
 */
export function tryCatch<E, A>(
  f: () => A,
  onThrow: (u: unknown) => E,
  __trace?: string
): Managed<unknown, E, A> {
  return fromEffect(T.tryCatch(f, onThrow), __trace)
}
