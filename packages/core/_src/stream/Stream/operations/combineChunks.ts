import { Handoff } from "@effect/core/stream/Stream/operations/_internal/Handoff"
import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Combines the chunks from this stream and the specified stream by repeatedly
 * applying the function `f` to extract a chunk using both sides and
 * conceptually "offer" it to the destination stream. `f` can maintain some
 * internal state to control the combining process, with the initial state
 * being specified by `s`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects combineChunks
 * @tsplus pipeable effect/core/stream/Stream combineChunks
 */
export function combineChunks<R, E, A, R2, E2, A2, S, A3>(
  that: LazyArg<Stream<R2, E2, A2>>,
  s: LazyArg<S>,
  f: (
    s: S,
    pullLeft: Effect<R, Maybe<E>, Chunk<A>>,
    pullRight: Effect<R2, Maybe<E2>, Chunk<A2>>
  ) => Effect<R | R2, never, Exit<Maybe<E | E2>, Tuple<[Chunk<A3>, S]>>>
) {
  return (self: Stream<R, E, A>): Stream<R | R2, E | E2, A3> =>
    new StreamInternal(
      Channel.unwrapScoped(
        Do(($) => {
          const left = $(Handoff.make<Take<E, A>>())
          const right = $(Handoff.make<Take<E2, A2>>())
          const latchL = $(Handoff.make<void>())
          const latchR = $(Handoff.make<void>())
          concreteStream(self)
          $((self.channel >> producer(left, latchL)).runScoped.fork)
          const that0 = that()
          concreteStream(that0)
          $((that0.channel >> producer(right, latchR)).runScoped.fork)
          const pullLeft = latchL.offer(undefined) > left.take.flatMap((take) => take.done)
          const pullRight = latchR.offer(undefined) > right.take.flatMap((take) => take.done)
          const stream = Stream.unfoldChunkEffect(
            s,
            (s) => f(s, pullLeft, pullRight).flatMap((exit) => Effect.done(exit).unsome)
          )
          concreteStream(stream)
          return stream.channel
        })
      )
    )
}

function producer<Err, Elem>(
  handoff: Handoff<Take<Err, Elem>>,
  latch: Handoff<void>
): Channel<never, Err, Chunk<Elem>, unknown, never, never, unknown> {
  return (
    Channel.fromEffect(latch.take) >
      Channel.readWithCause(
        (chunk: Chunk<Elem>) =>
          Channel.fromEffect(handoff.offer(Take.chunk(chunk))) > producer(handoff, latch),
        (cause) => Channel.fromEffect(handoff.offer(Take.failCause(cause))),
        () => Channel.fromEffect(handoff.offer(Take.end)) > producer(handoff, latch)
      )
  )
}
