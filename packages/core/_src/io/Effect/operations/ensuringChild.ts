/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not this
 * effect succeeds.
 *
 * @tsplus fluent ets/Effect ensuringChild
 */
export function ensuringChild_<R, E, A, R2, X>(
  self: Effect<R, E, A>,
  f: (_: Fiber<any, Chunk<unknown>>) => Effect.RIO<R2, X>,
  __tsplusTrace?: string
): Effect<R | R2, E, A> {
  return self.ensuringChildren((children) => f(Fiber.collectAll(children)))
}

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not
 * this effect succeeds.
 *
 * @tsplus static ets/Effect/Aspects ensuringChild
 */
export const ensuringChild = Pipeable(ensuringChild_)
