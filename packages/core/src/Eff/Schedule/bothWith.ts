import { both_ } from "./both"
import { map_ } from "./map_"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export const bothWith = <A, B, S2, R2, A2 extends A, B2, D>(
  that: Schedule<S2, R2, A2, B2>,
  f: (b: B, b2: B2) => D
) => <S, R>(self: Schedule<S, R, A, B>) => bothWith_(self, that, f)

/**
 * The same as `both` followed by `map`.
 */
export const bothWith_ = <S, R, A, B, S2, R2, A2 extends A, B2, D>(
  self: Schedule<S, R, A, B>,
  that: Schedule<S2, R2, A2, B2>,
  f: (b: B, b2: B2) => D
): Schedule<unknown, R & R2, A2, D> => map_(both_(self, that), ([b, b2]) => f(b, b2))
