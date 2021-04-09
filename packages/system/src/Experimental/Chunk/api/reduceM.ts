import * as core from "../../../Effect/core"
import type { Effect } from "../../../Effect/effect"
import type * as Chunk from "../core"
import { reduce_ } from "./reduce"

/**
 * Folds over the elements in this chunk from the left.
 */
export function reduceM_<A, R, E, S>(
  self: Chunk.Chunk<A>,
  s: S,
  f: (s: S, a: A) => Effect<R, E, S>
): Effect<R, E, S> {
  return reduce_(self, core.succeed(s) as Effect<R, E, S>, (s, a) =>
    core.chain_(s, (s1) => f(s1, a))
  )
}

/**
 * Folds over the elements in this chunk from the left.
 *
 * @dataFirst reduceM_
 */
export function reduceM<A, R, E, S>(
  s: S,
  f: (s: S, a: A) => Effect<R, E, S>
): (self: Chunk.Chunk<A>) => Effect<R, E, S> {
  return (self) => reduceM_(self, s, f)
}
