import { chain_ } from "./core"
import { Effect } from "./effect"

/**
 * Run that before self
 */
export const first = <S1, R1, E1>(that: Effect<S1, R1, E1, any>) => <S, R, E, A>(
  self: Effect<S, R, E, A>
) => chain_(that, () => self)
