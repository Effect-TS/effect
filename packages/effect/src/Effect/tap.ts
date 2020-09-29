import { chain } from "./core"
import type { Effect } from "./effect"
import { map } from "./map"

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 */
export function tap<A, R, E>(
  f: (_: A) => Effect<R, E, any>
): <E2, R2>(_: Effect<R2, E2, A>) => Effect<R & R2, E | E2, A> {
  return chain((a: A) => map(() => a)(f(a)))
}
