import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runIntoQueueElementsScoped
 * @tsplus pipeable effect/core/stream/Stream runIntoQueueElementsScoped
 * @category destructors
 * @since 1.0.0
 */
export function runIntoQueueElementsScoped<E1, A>(queue: Enqueue<Exit<Option.Option<E1>, A>>) {
  return <R, E extends E1>(self: Stream<R, E, A>): Effect<R | Scope, E | E1, void> => {
    const writer: Channel<
      R,
      E,
      Chunk.Chunk<A>,
      unknown,
      E,
      Exit<Option.Option<E | E1>, A>,
      unknown
    > = Channel.readWith(
      (input: Chunk.Chunk<A>) =>
        pipe(
          input,
          Chunk.reduce(
            Channel.unit as Channel<
              R,
              E,
              Chunk.Chunk<A>,
              unknown,
              E,
              Exit<Option.Option<E | E1>, A>,
              unknown
            >,
            (channel, a) => channel.flatMap(() => Channel.write(Exit.succeed(a)))
          )
        ).flatMap(() => writer),
      (err) => Channel.write(Exit.fail(Option.some(err))),
      () => Channel.write(Exit.fail(Option.none))
    )
    concreteStream(self)
    return self.channel
      .pipeTo(writer)
      .mapOutEffect((take) => queue.offer(take))
      .drain
      .runScoped
      .unit
  }
}
