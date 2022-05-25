import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * @tsplus fluent ets/Stream toPull
 */
export function toPull<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Effect<R & Has<Scope>, never, Effect<R, Option<E>, Chunk<A>>> {
  concreteStream(self)
  return self.channel.toPull().map((pull) =>
    pull.mapError(Option.some).flatMap((either) =>
      either.fold(
        () => Effect.fail(Option.none),
        (elem) => Effect.succeed(elem)
      )
    )
  )
}
