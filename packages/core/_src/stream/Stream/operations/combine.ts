import { Handoff } from "@effect/core/stream/Stream/operations/_internal/Handoff"
import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

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
 * @tsplus fluent ets/Stream combine
 */
export function combine_<R, E, A, R2, E2, A2, S, A3>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  s: LazyArg<S>,
  f: (
    s: S,
    pullLeft: Effect<R, Maybe<E>, A>,
    pullRight: Effect<R2, Maybe<E2>, A2>
  ) => Effect<R | R2, never, Exit<Maybe<E | E2>, Tuple<[A3, S]>>>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, A3> {
  return new StreamInternal(
    Channel.unwrapScoped(
      Effect.Do()
        .bind("left", () => Handoff.make<Exit<Maybe<E>, A>>())
        .bind("right", () => Handoff.make<Exit<Maybe<E2>, A2>>())
        .bind("latchL", () => Handoff.make<void>())
        .bind("latchR", () => Handoff.make<void>())
        .tap(({ latchL, left }) => {
          concreteStream(self)
          return (
            self.channel.concatMap((chunk) => Channel.writeChunk(chunk)) >>
            producer(left, latchL)
          )
            .runScoped
            .fork()
        })
        .tap(({ latchR, right }) => {
          const that0 = that()
          concreteStream(that0)
          return (
            that0.channel.concatMap((chunk) => Channel.writeChunk(chunk)) >>
            producer(right, latchR)
          )
            .runScoped
            .fork()
        })
        .bindValue(
          "pullLeft",
          ({ latchL, left }) => latchL.offer(undefined) > left.take().flatMap((exit) => Effect.done(exit))
        )
        .bindValue(
          "pullRight",
          ({ latchR, right }) => latchR.offer(undefined) > right.take().flatMap((exit) => Effect.done(exit))
        )
        .map(({ pullLeft, pullRight }) => {
          const stream = Stream.unfoldEffect(s, (s) =>
            f(s, pullLeft, pullRight)
              .flatMap((exit) => Effect.done(exit).unsome()))
          concreteStream(stream)
          return stream.channel
        })
    )
  )
}

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
 * @tsplus static ets/Stream/Aspects combine
 */
export const combine = Pipeable(combine_)

function producer<Err, Elem>(
  handoff: Handoff<Exit<Maybe<Err>, Elem>>,
  latch: Handoff<void>,
  __tsplusTrace?: string
): Channel<never, Err, Elem, unknown, never, never, unknown> {
  return (
    Channel.fromEffect(latch.take()) >
      Channel.readWithCause(
        (value) =>
          Channel.fromEffect(handoff.offer(Exit.succeed(value))) >
            producer(handoff, latch),
        (cause) => Channel.fromEffect(handoff.offer(Exit.failCause(cause.map(Maybe.some)))),
        () =>
          Channel.fromEffect(handoff.offer(Exit.fail(Maybe.none))) >
            producer(handoff, latch)
      )
  )
}
