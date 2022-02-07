// ets_tracing: off

import type { Clock } from "../Clock/index.js"
import { pipe } from "../Function/index.js"
import type { Has } from "../Has/index.js"
import * as as from "./as.js"
import type { Effect } from "./effect.js"
import * as interruption from "./interruption.js"
import * as map from "./map.js"
import * as race from "./race.js"
import * as sleep from "./sleep.js"

/**
 * Returns an effect that will timeout this effect, returning either the
 * default value if the timeout elapses before the effect has produced a
 * value; and or returning the result of applying the function `f` to the
 * success value of the effect.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted
 *
 * @ets_data_first timeoutTo_
 */
export function timeoutTo<B, B2, A>(
  d: number,
  b: B,
  f: (a: A) => B2,
  __trace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & Has<Clock>, E, B | B2> =>
    timeoutTo_(self, d, b, f)
}

/**
 * Returns an effect that will timeout this effect, returning either the
 * default value if the timeout elapses before the effect has produced a
 * value; and or returning the result of applying the function `f` to the
 * success value of the effect.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted
 */
export function timeoutTo_<R, E, A, B, B2>(
  self: Effect<R, E, A>,
  d: number,
  b: B,
  f: (a: A) => B2,
  __trace?: string
): Effect<R & Has<Clock>, E, B | B2> {
  return pipe(
    self,
    map.map(f),
    race.raceFirst(pipe(sleep.sleep(d), interruption.interruptible, as.as(b)), __trace)
  )
}
