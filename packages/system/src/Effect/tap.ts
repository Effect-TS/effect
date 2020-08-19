import { chain } from "./core"
import { Effect } from "./effect"
import { map } from "./map"

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 */
export const tap = <A, S, R, E>(
  f: (_: A) => Effect<S, R, E, any>
): (<S2, E2, R2>(_: Effect<S2, R2, E2, A>) => Effect<S | S2, R & R2, E | E2, A>) =>
  chain((a: A) => map(() => a)(f(a)))
