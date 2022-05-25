import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { Handoff } from "@effect/core/stream/Stream/operations/_internal/Handoff"
import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

type Signal<E, A> = Emit<A> | Halt<E> | End

export class Emit<A> {
  readonly _tag = "Emit"
  constructor(readonly elements: Chunk<A>) {}
}

export class Halt<E> {
  readonly _tag = "Halt"
  constructor(readonly error: Cause<E>) {}
}

export class End {
  readonly _tag = "End"
}

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a scope. Like all scoped values, the provided stream is valid
 * only within the scope.
 *
 * @tsplus fluent ets/Stream peel
 */
export function peel_<R, E extends E2, A extends A2, R2, E2, A2, Z>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E2, A2, A2, Z>>,
  __tsplusTrace?: string
): Effect<R & R2 & Has<Scope>, E | E2, Tuple<[Z, Stream<unknown, E, A2>]>> {
  return Effect.Do()
    .bind("deferred", () => Deferred.make<E | E2, Z>())
    .bind("handoff", () => Handoff.make<Signal<E, A2>>())
    .map(({ deferred, handoff }) => {
      const consumer: Sink<R & R2, E2, A2, A2, void> = sink()
        .exposeLeftover()
        .foldSink(
          (e) => Sink.fromEffect(deferred.fail(e)) > Sink.fail(e),
          ({ tuple: [z1, leftovers] }) => {
            const loop: Channel<
              unknown,
              E,
              Chunk<A2>,
              unknown,
              E | E2,
              Chunk<A2>,
              void
            > = Channel.readWithCause(
              (chunk: Chunk<A2>) => Channel.fromEffect(handoff.offer(new Emit(chunk))) > loop,
              (cause) =>
                Channel.fromEffect(handoff.offer(new Halt(cause))) >
                  Channel.failCause(cause),
              () => Channel.fromEffect(handoff.offer(new End())) > Channel.unit
            )
            return new SinkInternal(
              Channel.fromEffect(deferred.succeed(z1)) >
                Channel.fromEffect(handoff.offer(new Emit(leftovers))) >
                loop
            )
          }
        )

      const producer: Channel<
        unknown,
        unknown,
        unknown,
        unknown,
        E,
        Chunk<A2>,
        void
      > = Channel.unwrap(
        handoff.take().map((signal) => {
          switch (signal._tag) {
            case "Emit": {
              return Channel.write(signal.elements) > producer
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
        .runScoped(consumer)
        .fork()
        .flatMap(() => deferred.await())
        .map((z) => Tuple(z, new StreamInternal(producer)))
    })
    .flatten()
}

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a scope. Like all scoped values, the provided stream is valid
 * only within the scope.
 *
 * @tsplus static ets/Stream/Aspects peel
 */
export const peel = Pipeable(peel_)
