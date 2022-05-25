import { Handoff } from "@effect/core/stream/Stream/operations/_internal/Handoff"
import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Combines the chunks from this stream and the specified stream by repeatedly
 * applying the function `f` to extract a chunk using both sides and
 * conceptually "offer" it to the destination stream. `f` can maintain some
 * internal state to control the combining process, with the initial state
 * being specified by `s`.
 *
 * @tsplus fluent ets/Stream combineChunks
 */
export function combineChunks_<R, E, A, R2, E2, A2, S, A3>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  s: LazyArg<S>,
  f: (
    s: S,
    pullLeft: Effect<R, Option<E>, Chunk<A>>,
    pullRight: Effect<R2, Option<E2>, Chunk<A2>>
  ) => Effect<R & R2, never, Exit<Option<E | E2>, Tuple<[Chunk<A3>, S]>>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A3> {
  return new StreamInternal(
    Channel.unwrapScoped(
      Effect.Do()
        .bind("left", () => Handoff.make<Take<E, A>>())
        .bind("right", () => Handoff.make<Take<E2, A2>>())
        .bind("latchL", () => Handoff.make<void>())
        .bind("latchR", () => Handoff.make<void>())
        .tap(({ latchL, left }) => {
          concreteStream(self)
          return (self.channel >> producer(left, latchL)).runScoped().fork()
        })
        .tap(({ latchR, right }) => {
          const that0 = that()
          concreteStream(that0)
          return (that0.channel >> producer(right, latchR)).runScoped().fork()
        })
        .bindValue(
          "pullLeft",
          ({ latchL, left }) => latchL.offer(undefined) > left.take().flatMap((take) => take.done())
        )
        .bindValue(
          "pullRight",
          ({ latchR, right }) => latchR.offer(undefined) > right.take().flatMap((take) => take.done())
        )
        .map(({ pullLeft, pullRight }) => {
          const stream = Stream.unfoldChunkEffect(s, (s) =>
            f(s, pullLeft, pullRight)
              .flatMap((exit) => Effect.done(exit).unsome()))
          concreteStream(stream)
          return stream.channel
        })
    )
  )
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly
 * applying the function `f` to extract a chunk using both sides and
 * conceptually "offer" it to the destination stream. `f` can maintain some
 * internal state to control the combining process, with the initial state
 * being specified by `s`.
 *
 * @tsplus static ets/Stream/Aspects combineChunks
 */
export const combineChunks = Pipeable(combineChunks_)

function producer<Err, Elem>(
  handoff: Handoff<Take<Err, Elem>>,
  latch: Handoff<void>,
  __tsplusTrace?: string
): Channel<unknown, Err, Chunk<Elem>, unknown, never, never, unknown> {
  return (
    Channel.fromEffect(latch.take()) >
      Channel.readWithCause(
        (chunk: Chunk<Elem>) => Channel.fromEffect(handoff.offer(Take.chunk(chunk))) > producer(handoff, latch),
        (cause) => Channel.fromEffect(handoff.offer(Take.failCause(cause))),
        () => Channel.fromEffect(handoff.offer(Take.end)) > producer(handoff, latch)
      )
  )
}
