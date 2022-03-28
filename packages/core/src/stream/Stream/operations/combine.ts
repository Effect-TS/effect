import type { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import { Exit } from "../../../io/Exit"
import { Managed } from "../../../io/Managed"
import { Channel } from "../../Channel"
import { Stream } from "../definition"
import { Handoff } from "./_internal/Handoff"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

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
    pullLeft: Effect<R, Option<E>, A>,
    pullRight: Effect<R2, Option<E2>, A2>
  ) => Effect<R & R2, never, Exit<Option<E | E2>, Tuple<[A3, S]>>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A3> {
  return new StreamInternal(
    Channel.managed(
      Managed.Do()
        .bind("left", () => Handoff.make<Exit<Option<E>, A>>().toManaged())
        .bind("right", () => Handoff.make<Exit<Option<E2>, A2>>().toManaged())
        .bind("latchL", () => Handoff.make<void>().toManaged())
        .bind("latchR", () => Handoff.make<void>().toManaged())
        .tap(({ latchL, left }) => {
          concreteStream(self)
          return (
            self.channel.concatMap((chunk) => Channel.writeChunk(chunk)) >>
            producer(left, latchL)
          )
            .runManaged()
            .fork()
        })
        .tap(({ latchR, right }) => {
          const that0 = that()
          concreteStream(that0)
          return (
            that0.channel.concatMap((chunk) => Channel.writeChunk(chunk)) >>
            producer(right, latchR)
          )
            .runManaged()
            .fork()
        }),
      ({ latchL, latchR, left, right }) => {
        const pullLeft =
          latchL.offer(undefined) > left.take().flatMap((exit) => Effect.done(exit))
        const pullRight =
          latchR.offer(undefined) > right.take().flatMap((exit) => Effect.done(exit))
        const stream = Stream.unfoldEffect(s, (s) =>
          f(s, pullLeft, pullRight).flatMap((exit) => Effect.done(exit).unsome())
        )
        concreteStream(stream)
        return stream.channel
      }
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
 */
export const combine = Pipeable(combine_)

function producer<Err, Elem>(
  handoff: Handoff<Exit<Option<Err>, Elem>>,
  latch: Handoff<void>,
  __tsplusTrace?: string
): Channel<unknown, Err, Elem, unknown, never, never, unknown> {
  return (
    Channel.fromEffect(latch.take()) >
    Channel.readWithCause(
      (value) =>
        Channel.fromEffect(handoff.offer(Exit.succeed(value))) >
        producer(handoff, latch),
      (cause) =>
        Channel.fromEffect(handoff.offer(Exit.failCause(cause.map(Option.some)))),
      () =>
        Channel.fromEffect(handoff.offer(Exit.fail(Option.none))) >
        producer(handoff, latch)
    )
  )
}
