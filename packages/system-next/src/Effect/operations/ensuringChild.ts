import type { Chunk } from "../../Collections/Immutable/Chunk"
import type { Fiber } from "../../Fiber/definition"
import { collectAll } from "../../Fiber/operations/collectAll"
import type { Effect, RIO } from "../definition"
import { ensuringChildren_ } from "./ensuringChildren"

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not this
 * effect succeeds.
 *
 * @ets fluent ets/Effect ensuringChild
 */
export function ensuringChild_<R, E, A, R2, X>(
  fa: Effect<R, E, A>,
  f: (_: Fiber<any, Chunk<unknown>>) => RIO<R2, X>,
  __trace?: string
) {
  return ensuringChildren_(fa, (children) => f(collectAll(children)), __trace)
}

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not
 * this effect succeeds.
 *
 * @ets_data_first ensuringChild_
 */
export function ensuringChild<R, E, A, R2, X>(
  f: (_: Fiber<any, Chunk<unknown>>) => RIO<R2, X>,
  __trace?: string
) {
  return (fa: Effect<R, E, A>) => ensuringChild_(fa, f, __trace)
}
