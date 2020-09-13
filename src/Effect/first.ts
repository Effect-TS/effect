import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Run that before self
 */
export function first<S1, R1, E1>(that: Effect<S1, R1, E1, any>) {
  return <S, R, E, A>(self: Effect<S, R, E, A>) => chain_(that, () => self)
}
