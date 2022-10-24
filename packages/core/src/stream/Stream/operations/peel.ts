import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { Handoff } from "@effect/core/stream/Stream/operations/_internal/Handoff"
import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

type Signal<E, A> = Emit<A> | Halt<E> | End

class Emit<A> {
  readonly _tag = "Emit"
  constructor(readonly elements: Chunk<A>) {}
}

class Halt<E> {
  readonly _tag = "Halt"
  constructor(readonly error: Cause<E>) {}
}

class End {
  readonly _tag = "End"
}

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a scope. Like all scoped values, the provided stream is valid
 * only within the scope.
 *
 * @tsplus static effect/core/stream/Stream.Aspects peel
 * @tsplus pipeable effect/core/stream/Stream peel
 * @category mutations
 * @since 1.0.0
 */
export function peel<R2, E2, A2, Z>(sink: Sink<R2, E2, A2, A2, Z>) {
  return <R, E extends E2, A extends A2>(
    self: Stream<R, E, A>
  ): Effect<R | R2 | Scope, E | E2, readonly [Z, Stream<never, E, A2>]> =>
    Do(($) => {
      const deferred = $(Deferred.make<E | E2, Z>())
      const handoff = $(Handoff.make<Signal<E, A2>>())
      const consumer = sink.exposeLeftover
        .foldSink(
          (e) => Sink.fromEffect(deferred.fail(e)) > Sink.fail(e),
          ([z1, leftovers]) => {
            const loop: Channel<
              never,
              E,
              Chunk<A2>,
              unknown,
              E | E2,
              Chunk<A2>,
              void
            > = Channel.readWithCause(
              (chunk: Chunk<A2>) =>
                Channel.fromEffect(handoff.offer(new Emit(chunk))).flatMap(() => loop),
              (cause) =>
                Channel.fromEffect(handoff.offer(new Halt(cause))).flatMap(() =>
                  Channel.failCause(cause)
                ),
              () => Channel.fromEffect(handoff.offer(new End())).flatMap(() => Channel.unit)
            )
            return new SinkInternal(
              Channel.fromEffect(deferred.succeed(z1)).flatMap(() =>
                Channel.fromEffect(handoff.offer(new Emit(leftovers)))
              ).flatMap(() => loop)
            )
          }
        )

      const producer: Channel<
        never,
        unknown,
        unknown,
        unknown,
        E,
        Chunk<A2>,
        void
      > = Channel.unwrap(
        handoff.take.map((signal) => {
          switch (signal._tag) {
            case "Emit": {
              return Channel.write(signal.elements).flatMap(() => producer)
            }
            case "Halt": {
              return Channel.failCause(signal.error)
            }
            case "End": {
              return Channel.unit
            }
          }
        })
      )

      return self
        .tapErrorCause((cause) => deferred.failCause(cause))
        .runScoped(consumer)
        .forkScoped
        .flatMap(() => deferred.await)
        .map((z) => [z, new StreamInternal(producer)] as const)
    }).flatten
}
