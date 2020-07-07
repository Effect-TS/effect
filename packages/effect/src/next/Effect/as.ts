import { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Maps the success value of this effect to the specified constant value.
 */
export const as_ = <S, R, E, A, B>(self: Effect<S, R, E, A>, b: B) =>
  map_(self, () => b)

/**
 * Maps the success value of this effect to the specified constant value.
 */
export const as = <B>(b: B) => <S, R, E, A>(self: Effect<S, R, E, A>) =>
  map_(self, () => b)
