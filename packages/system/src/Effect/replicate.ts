import { range } from "../Array"
import type { Effect } from "./effect"

/**
 * Replicates the given effect `n` times.
 */
export function replicate(n: number) {
  return <R, E, A>(self: Effect<R, E, A>) => range(0, n).map(() => self)
}
