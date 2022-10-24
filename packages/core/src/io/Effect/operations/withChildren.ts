import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

/**
 * Locally installs a supervisor and an effect that succeeds with all the
 * children that have been forked in the returned effect.
 *
 * @tsplus static effect/core/io/Effect.Ops withChildren
 * @category mutations
 * @since 1.0.0
 */
export function withChildren<R, E, A>(
  get: (children: Effect<never, never, Chunk.Chunk<Fiber.Runtime<any, any>>>) => Effect<R, E, A>
): Effect<R, E, A> {
  return Supervisor.track.flatMap((supervisor) =>
    get(
      supervisor.value.flatMap((children) =>
        Effect.descriptor.map((descriptor) =>
          // Filter out the fiber id of whoever is calling `withChildren`
          pipe(children, Chunk.filter((fiber) => !Equal.equals(fiber.id, descriptor.id)))
        )
      )
    ).supervised(supervisor)
  )
}
