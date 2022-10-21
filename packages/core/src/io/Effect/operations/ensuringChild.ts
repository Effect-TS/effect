/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not this
 * effect succeeds.
 *
 * @tsplus static effect/core/io/Effect.Aspects ensuringChild
 * @tsplus pipeable effect/core/io/Effect ensuringChild
 */
export function ensuringChild<R2, X>(f: (_: Fiber<any, Chunk<unknown>>) => Effect<R2, never, X>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E, A> =>
    self.ensuringChildren((children) => f(Fiber.collectAll(children)))
}
