import type * as Chunk from "../../Collections/Immutable/Chunk/core"
import * as Fiber from "../../Fiber"
import type { Effect, RIO } from "../definition"
import { forEach_ } from "./excl-forEach"
import { fork } from "./fork"
import { map_ } from "./map"

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 *
 * @ets static ets/EffectOps forkAll
 */
export function forkAll<R, E, A>(
  effects: Iterable<Effect<R, E, A>>,
  __trace?: string
): RIO<R, Fiber.Fiber<E, Chunk.Chunk<A>>> {
  return map_(forEach_(effects, fork, __trace), Fiber.collectAll)
}
