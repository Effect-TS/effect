/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @tsplus fluent ets/Effect ensuringChildren
 */
export function ensuringChildren_<R, E, A, R1, X>(
  self: Effect<R, E, A>,
  children: (_: Chunk<Fiber.Runtime<any, any>>) => Effect.RIO<R1, X>,
  __tsplusTrace?: string
): Effect<R & R1, E, A> {
  return Supervisor.track().flatMap((supervisor) =>
    self.supervised(supervisor).ensuring(supervisor.value.flatMap(children))
  )
}

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @tsplus static ets/Effect/Aspects ensuringChildren
 */
export const ensuringChildren = Pipeable(ensuringChildren_)
