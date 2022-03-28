import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import { Managed } from "../../../io/Managed"
import { Channel } from "../../Channel"
import { Take } from "../../Take"
import { Stream } from "../definition"
import { Handoff } from "./_internal/Handoff"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

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
    Channel.managed(
      Managed.Do()
        .bind("left", () => Handoff.make<Take<E, A>>().toManaged())
        .bind("right", () => Handoff.make<Take<E2, A2>>().toManaged())
        .bind("latchL", () => Handoff.make<void>().toManaged())
        .bind("latchR", () => Handoff.make<void>().toManaged())
        .tap(({ latchL, left }) => {
          concreteStream(self)
          return (self.channel >> producer(left, latchL)).runManaged().fork()
        })
        .tap(({ latchR, right }) => {
          const that0 = that()
          concreteStream(that0)
          return (that0.channel >> producer(right, latchR)).runManaged().fork()
        }),
      ({ latchL, latchR, left, right }) => {
        const pullLeft =
          latchL.offer(undefined) > left.take().flatMap((take) => take.done())
        const pullRight =
          latchR.offer(undefined) > right.take().flatMap((take) => take.done())
        const stream = Stream.unfoldChunkEffect(s, (s) =>
          f(s, pullLeft, pullRight).flatMap((exit) => Effect.done(exit).unsome())
        )
        concreteStream(stream)
        return stream.channel
      }
    )
  )
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly
 * applying the function `f` to extract a chunk using both sides and
 * conceptually "offer" it to the destination stream. `f` can maintain some
 * internal state to control the combining process, with the initial state
 * being specified by `s`.
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
      (chunk: Chunk<Elem>) =>
        Channel.fromEffect(handoff.offer(Take.chunk(chunk))) > producer(handoff, latch),
      (cause) => Channel.fromEffect(handoff.offer(Take.failCause(cause))),
      () => Channel.fromEffect(handoff.offer(Take.end)) > producer(handoff, latch)
    )
  )
}
