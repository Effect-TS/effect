import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus getter effect/core/stream/Stream toPull
 * @category destructors
 * @since 1.0.0
 */
export function toPull<R, E, A>(
  self: Stream<R, E, A>
): Effect<R | Scope, never, Effect<R, Option.Option<E>, Chunk<A>>> {
  concreteStream(self)
  return self.channel.toPull.map((pull) =>
    pull.mapError(Option.some).flatMap((either) => {
      switch (either._tag) {
        case "Left": {
          return Effect.fail(Option.none)
        }
        case "Right": {
          return Effect.succeed(either.right)
        }
      }
    })
  )
}
