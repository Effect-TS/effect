// ets_tracing: off

import type * as Chunk from "../Collections/Immutable/Chunk"
import * as Fiber from "../Fiber"
import { fork } from "./core"
import type { Effect, RIO } from "./effect"
import { forEach_, forEachUnit_ } from "./excl-forEach"
import { map_ } from "./map"

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 */
export function forkAll<R, E, A>(
  effects: Iterable<Effect<R, E, A>>,
  __trace?: string
): RIO<R, Fiber.Fiber<E, Chunk.Chunk<A>>> {
  return map_(forEach_(effects, fork, __trace), Fiber.collectAll)
}

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces unit. This version is faster than `forkAll`
 * in cases where the results of the forked fibers are not needed.
 */
export function forkAllUnit<R, E, A>(
  effects: Iterable<Effect<R, E, A>>,
  __trace?: string
) {
  return forEachUnit_(effects, fork, __trace)
}
