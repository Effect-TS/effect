import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @tsplus static effect/core/io/Effect.Aspects ensuringChildren
 * @tsplus pipeable effect/core/io/Effect ensuringChildren
 * @category finalizers
 * @since 1.0.0
 */
export function ensuringChildren<R1, X>(
  children: (fibers: Chunk<Fiber.Runtime<any, any>>) => Effect<R1, never, X>
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R1, E, A> =>
    Supervisor.track.flatMap((supervisor) =>
      self.supervised(supervisor).ensuring(supervisor.value.flatMap(children))
    )
}
