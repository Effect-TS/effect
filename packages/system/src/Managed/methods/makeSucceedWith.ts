import { make_ } from "../core"
import { succeedWith } from "../deps-core"
import type { Managed } from "../managed"

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action. The acquire and
 * release actions will be performed uninterruptibly.
 */
export function makeSucceedWith<A, B>(
  acquire: () => A,
  release: (a: A) => B,
  __trace?: string
): Managed<unknown, never, A> {
  return make_(succeedWith(acquire, __trace), (a) =>
    succeedWith(() => release(a), __trace)
  )
}
