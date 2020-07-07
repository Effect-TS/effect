import { map_ } from "./map_"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that maps this schedule to a constant output.
 */
export const as_ = <S, R, ST, A, B, C>(self: Schedule<S, R, ST, A, B>, c: C) =>
  map_(self, () => c)

/**
 * Returns a new schedule that maps this schedule to a constant output.
 */
export const as = <C>(c: C) => <S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) =>
  map_(self, () => c)
