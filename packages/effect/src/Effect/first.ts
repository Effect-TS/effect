import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Run that before self
 */
export function first<R1, E1>(that: Effect<R1, E1, any>) {
  return <R, E, A>(self: Effect<R, E, A>) => chain_(that, () => self)
}
