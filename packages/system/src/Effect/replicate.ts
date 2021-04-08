// tracing: off

import { range } from "../Collections/Immutable/Array"
import type { Effect } from "./effect"

/**
 * Replicates the given effect `n` times.
 *
 * @dataFirst replicate_
 */
export function replicate(n: number, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => replicate_(self, n)
}

/**
 * Replicates the given effect `n` times.
 */
export function replicate_<R, E, A>(self: Effect<R, E, A>, n: number) {
  return range(0, n).map(() => self)
}
