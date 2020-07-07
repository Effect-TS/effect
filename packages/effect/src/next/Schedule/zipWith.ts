import { map_ } from "./map_"
import { Schedule } from "./schedule"
import { zip_ } from "./zip"

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export const zipWith = <A, B, S2, R2, ST2, A2 extends A, B2, D>(
  that: Schedule<S2, R2, ST2, A2, B2>,
  f: (b: B, b2: B2) => D
) => <S, R, ST>(self: Schedule<S, R, ST, A, B>) => zipWith_(self, that, f)

/**
 * The same as `both` followed by `map`.
 */
export const zipWith_ = <S, R, ST, A, B, S2, R2, ST2, A2 extends A, B2, D>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, A2, B2>,
  f: (b: B, b2: B2) => D
): Schedule<unknown, R & R2, [ST, ST2], A2, D> =>
  map_(zip_(self, that), ([b, b2]) => f(b, b2))
