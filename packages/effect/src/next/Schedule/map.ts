import { map_ } from "./map_"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that maps over the output of this one.
 */
export const map = <B, C>(f: (b: B) => C) => <S, R, ST, A>(
  self: Schedule<S, R, ST, A, B>
) => map_(self, f)
