import type { Chunk } from "../../../collection/immutable/Chunk/core"
import type { Fiber } from "../../Fiber/definition"
import { collectAll } from "../../Fiber/operations/collectAll"
import type { Effect, RIO } from "../definition"

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not this
 * effect succeeds.
 *
 * @tsplus fluent ets/Effect ensuringChild
 */
export function ensuringChild_<R, E, A, R2, X>(
  self: Effect<R, E, A>,
  f: (_: Fiber<any, Chunk<unknown>>) => RIO<R2, X>,
  __etsTrace?: string
) {
  return self.ensuringChildren((children) => f(collectAll(children)))
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
  __etsTrace?: string
) {
  return (self: Effect<R, E, A>) => ensuringChild_(self, f)
}
