import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * @tsplus getter effect/core/stream/Stream toPull
 */
export function toPull<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Effect<R | Scope, never, Effect<R, Maybe<E>, Chunk<A>>> {
  concreteStream(self)
  return self.channel.toPull.map((pull) =>
    pull.mapError(Maybe.some).flatMap((either) =>
      either.fold(
        () => Effect.fail(Maybe.none),
        (elem) => Effect.succeed(elem)
      )
    )
  )
}
