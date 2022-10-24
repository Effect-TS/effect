import { Handoff } from "@effect/core/stream/Stream/operations/_internal/Handoff"
import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Option from "@fp-ts/data/Option"

/**
 * Combines the elements from this stream and the specified stream by
 * repeatedly applying the function `f` to extract an element using both sides
 * and conceptually "offer" it to the destination stream. `f` can maintain
 * some internal state to control the combining process, with the initial
 * state being specified by `s`.
 *
 * Where possible, prefer `Stream.combineChunks` for a more efficient
 * implementation.
 *
 * @tsplus static effect/core/stream/Stream.Aspects combine
 * @tsplus pipeable effect/core/stream/Stream combine
 * @category mutations
 * @since 1.0.0
 */
export function combine<R, E, A, R2, E2, A2, S, A3>(
  that: Stream<R2, E2, A2>,
  s: S,
  f: (
    s: S,
    pullLeft: Effect<R, Option.Option<E>, A>,
    pullRight: Effect<R2, Option.Option<E2>, A2>
  ) => Effect<R | R2, never, Exit<Option.Option<E | E2>, readonly [A3, S]>>
) {
  return (self: Stream<R, E, A>): Stream<R | R2, E | E2, A3> =>
    new StreamInternal(
      Channel.unwrapScoped(
        Do(($) => {
          const left = $(Handoff.make<Exit<Option.Option<E>, A>>())
          const right = $(Handoff.make<Exit<Option.Option<E2>, A2>>())
          const latchL = $(Handoff.make<void>())
          const latchR = $(Handoff.make<void>())
          concreteStream(self)
          $(
            self.channel.concatMap((chunk) => Channel.writeChunk(chunk))
              .pipeTo(producer(left, latchL))
              .runScoped
              .forkScoped
          )
          concreteStream(that)
          $(
            that.channel.concatMap((chunk) => Channel.writeChunk(chunk))
              .pipeTo(producer(right, latchR))
              .runScoped
              .forkScoped
          )
          const pullLeft = latchL.offer(undefined)
            .zipRight(left.take.flatMap((exit) => Effect.done(exit)))
          const pullRight = latchR.offer(undefined)
            .zipRight(right.take.flatMap((exit) => Effect.done(exit)))
          const stream = Stream.unfoldEffect(s, (s) =>
            f(s, pullLeft, pullRight).flatMap((exit) => Effect.done(exit).unsome))
          concreteStream(stream)
          return stream.channel
        })
      )
    )
}

function producer<Err, Elem>(
  handoff: Handoff<Exit<Option.Option<Err>, Elem>>,
  latch: Handoff<void>
): Channel<never, Err, Elem, unknown, never, never, unknown> {
  return (
    Channel.fromEffect(latch.take).flatMap(() =>
      Channel.readWithCause(
        (value) =>
          Channel.fromEffect(handoff.offer(Exit.succeed(value)))
            .flatMap(() => producer(handoff, latch)),
        (cause) => Channel.fromEffect(handoff.offer(Exit.failCause(cause.map(Option.some)))),
        () =>
          Channel.fromEffect(handoff.offer(Exit.fail(Option.none))).flatMap(() =>
            producer(handoff, latch)
          )
      )
    )
  )
}
