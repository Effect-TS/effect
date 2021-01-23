import type { Cause } from "../Cause/cause"
import * as O from "../Option"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Recovers from some or all of the error cases with provided cause.
 */
export function catchSomeCause_<R2, E2, A2, R, E, A>(
  effect: Effect<R2, E2, A2>,
  f: (_: Cause<E2>) => O.Option<Effect<R, E, A>>
) {
  return foldCauseM_(
    effect,
    (c): Effect<R, E | E2, A> =>
      O.fold_(
        f(c),
        () => halt(c),
        (a) => a
      ),
    (x) => succeed(x)
  )
}

/**
 * Recovers from some or all of the error cases with provided cause.
 */
export function catchSomeCause<R, E, E2, A>(
  f: (_: Cause<E2>) => O.Option<Effect<R, E, A>>
) {
  return <R2, A2>(effect: Effect<R2, E2, A2>) => catchSomeCause_(effect, f)
}
