import { map_ } from "./map_"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that maps this schedule to a constant output.
 */
export const as_ = <S, R, A, B, C>(self: Schedule<S, R, A, B>, c: C) =>
  map_(self, () => c)

/**
 * Returns a new schedule that maps this schedule to a constant output.
 */
export const as = <C>(c: C) => <S, R, A, B>(self: Schedule<S, R, A, B>) =>
  map_(self, () => c)
