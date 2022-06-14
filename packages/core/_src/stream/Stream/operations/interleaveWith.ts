import { Handoff } from "@effect/core/stream/Stream/operations/_internal/Handoff"
import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `b` to control which stream to pull from next.
 * `true` indicates to pull from this stream and `false` indicates to pull
 * from the specified stream. Only consumes as many elements as requested by
 * `b`. If either this stream or the specified stream are exhausted further
 * requests for values from that stream will be ignored.
 *
 * @tsplus fluent ets/Stream interleaveWith
 */
export function interleaveWith_<R, E, A, R2, E2, A2, R3, E3>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  b: LazyArg<Stream<R3, E3, boolean>>,
  __tsplusTrace?: string
): Stream<R | R2 | R3, E | E2 | E3, A | A2> {
  concreteStream(self)
  return new StreamInternal(
    Channel.unwrapScoped(
      Effect.Do()
        .bind("left", () => Handoff.make<Take<E | E2 | E3, A | A2>>())
        .bind("right", () => Handoff.make<Take<E | E2 | E3, A | A2>>())
        .tap(({ left }) =>
          (self.channel.concatMap(Channel.writeChunk) >> producer(left))
            .runScoped
            .fork()
        )
        .tap(({ right }) => {
          const that0 = that()
          concreteStream(that0)
          return (that0.channel.concatMap(Channel.writeChunk) >> producer(right))
            .runScoped
            .fork()
        })
        .map(({ left, right }) => {
          const b0 = b()
          concreteStream(b0)
          return (
            b0.channel.concatMap(Channel.writeChunk) >> process(left, right, false, false)
          )
        })
    )
  )
}

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `b` to control which stream to pull from next.
 * `true` indicates to pull from this stream and `false` indicates to pull
 * from the specified stream. Only consumes as many elements as requested by
 * `b`. If either this stream or the specified stream are exhausted further
 * requests for values from that stream will be ignored.
 *
 * @tsplus static ets/Stream/Aspects interleaveWith
 */
export const interleaveWith = Pipeable(interleaveWith_)

function producer<E, E2, E3, A, A2>(
  handoff: Handoff<Take<E | E2 | E3, A | A2>>,
  __tsplusTrace?: string
): Channel<never, E | E2 | E3, A | A2, unknown, never, never, void> {
  return Channel.readWithCause(
    (value: A | A2) =>
      Channel.fromEffect(handoff.offer(Take.single(value))) >
        producer<E, E2, E3, A, A2>(handoff),
    (cause) => Channel.fromEffect(handoff.offer(Take.failCause(cause))),
    () => Channel.fromEffect(handoff.offer(Take.end))
  )
}

function process<E, E2, E3, A, A2>(
  left: Handoff<Take<E | E2 | E3, A | A2>>,
  right: Handoff<Take<E | E2 | E3, A | A2>>,
  leftDone: boolean,
  rightDone: boolean,
  __tsplusTrace?: string
): Channel<never, E | E2 | E3, boolean, unknown, E | E2 | E3, Chunk<A | A2>, void> {
  return Channel.readWithCause(
    (bool: boolean) => {
      if (bool && !leftDone) {
        return Channel.fromEffect(left.take()).flatMap((take) =>
          take.fold(
            rightDone ? Channel.unit : process(left, right, true, rightDone),
            (cause) => Channel.failCause(cause),
            (chunk) => Channel.write(chunk) > process(left, right, leftDone, rightDone)
          )
        )
      }
      if (!bool && !rightDone) {
        return Channel.fromEffect(right.take()).flatMap((take) =>
          take.fold(
            leftDone ? Channel.unit : process(left, right, leftDone, true),
            (cause) => Channel.failCause(cause),
            (chunk) => Channel.write(chunk) > process(left, right, leftDone, rightDone)
          )
        )
      }
      return process(left, right, leftDone, rightDone)
    },
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
}
