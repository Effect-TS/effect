import type { Chunk } from "../../../collection/immutable/Chunk"
import { track } from "../../../io/Supervisor/operations/track"
import type { Fiber } from "../../Fiber/definition"
import type { Effect, RIO } from "../definition"

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @tsplus fluent ets/Effect ensuringChildren
 */
export function ensuringChildren_<R, E, A, R1, X>(
  self: Effect<R, E, A>,
  children: (_: Chunk<Fiber.Runtime<any, any>>) => RIO<R1, X>,
  __tsplusTrace?: string
): Effect<R & R1, E, A> {
  return track().flatMap((supervisor) =>
    self.supervised(supervisor).ensuring(supervisor.value.flatMap(children))
  )
}

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @ets_data_first ensuringChildren_
 */
export function ensuringChildren<R1, X>(
  children: (_: Chunk<Fiber.Runtime<any, any>>) => RIO<R1, X>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R1, E, A> =>
    self.ensuringChildren(children)
}
