import type { Chunk } from "../../Collections/Immutable/Chunk"
import type * as Fiber from "../../Fiber/definition"
import { track } from "../../Supervisor/operations/track"
import type { Effect, RIO } from "../definition"
import { chain_ } from "./chain"
import { ensuring_ } from "./ensuring"
import { supervised_ } from "./supervised"

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 */
export function ensuringChildren_<R, E, A, R1, X>(
  self: Effect<R, E, A>,
  children: (_: Chunk<Fiber.Runtime<any, any>>) => RIO<R1, X>,
  __trace?: string
): Effect<R & R1, E, A> {
  return chain_(
    track,
    (supervisor) =>
      ensuring_(supervised_(self, supervisor), chain_(supervisor.value, children)),
    __trace
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
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R1, E, A> =>
    ensuringChildren_(self, children, __trace)
}
