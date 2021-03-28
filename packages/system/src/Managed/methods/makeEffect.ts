import { make_ } from "../core"
import { effectTotal } from "../deps-core"
import type { Managed } from "../managed"

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action. The acquire and
 * release actions will be performed uninterruptibly.
 */
export function makeEffectTotal<A, B>(
  acquire: () => A,
  release: (a: A) => B,
  __trace?: string
): Managed<unknown, never, A> {
  return make_(effectTotal(acquire, __trace), (a) =>
    effectTotal(() => release(a), __trace)
  )
}
