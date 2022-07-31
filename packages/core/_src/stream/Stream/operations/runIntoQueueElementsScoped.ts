import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runIntoQueueElementsScoped
 * @tsplus pipeable effect/core/stream/Stream runIntoQueueElementsScoped
 */
export function runIntoQueueElementsScoped<E1, A>(
  queue: LazyArg<Enqueue<Exit<Maybe<E1>, A>>>
) {
  return <R, E extends E1>(self: Stream<R, E, A>): Effect<R | Scope, E | E1, void> => {
    const writer: Channel<
      R,
      E,
      Chunk<A>,
      unknown,
      E,
      Exit<Maybe<E | E1>, A>,
      unknown
    > = Channel.readWith(
      (input: Chunk<A>) =>
        input.reduce(
          Channel.unit as Channel<
            R,
            E,
            Chunk<A>,
            unknown,
            E,
            Exit<Maybe<E | E1>, A>,
            unknown
          >,
          (channel, a) => channel > Channel.write(Exit.succeed(a))
        ) > writer,
      (err) => Channel.write(Exit.fail(Maybe.some(err))),
      () => Channel.write(Exit.fail(Maybe.none))
    )
    concreteStream(self)
    return (self.channel >> writer)
      .mapOutEffect((take) => queue().offer(take))
      .drain
      .runScoped
      .unit
  }
}
