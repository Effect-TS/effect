import { Handoff } from "@effect/core/stream/Stream/operations/_internal/Handoff"
import { HandoffSignal } from "@effect/core/stream/Stream/operations/_internal/HandoffSignal"
import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { SinkEndReason } from "@effect/core/stream/Stream/SinkEndReason"

type DebounceState<E, A> = NotStarted | Previous<A> | Current<E, A>

class NotStarted {
  readonly _tag = "NotStarted"
}

class Previous<A> {
  readonly _tag = "Previous"
  constructor(readonly fiber: Fiber<never, Chunk<A>>) {}
}

class Current<E, A> {
  readonly _tag = "Current"
  constructor(readonly fiber: Fiber<E, HandoffSignal<E, A>>) {}
}

/**
 * Delays the emission of values by holding new values for a set duration. If
 * no new values arrive during that time the value is emitted, however if a
 * new value is received during the holding period the previous value is
 * discarded and the process is repeated with the new value.
 *
 * This operator is useful if you have a stream of "bursty" events which
 * eventually settle down and you only need the final event of the burst.
 *
 * @example A search engine may only want to initiate a search after a user has
 * paused typing so as to not prematurely recommend results.
 *
 * @tsplus static effect/core/stream/Stream.Aspects debounce
 * @tsplus pipeable effect/core/stream/Stream debounce
 */
export function debounce<R, E, A>(
  duration0: LazyArg<Duration>,
  __tsplusTrace?: string
) {
  return (self: Stream<R, E, A>): Stream<R, E, A> =>
    Stream.unwrap(
      Effect.transplant((grafter) =>
        Do(($) => {
          const duration = $(Effect.succeed(duration0))
          const handoff = $(Handoff.make<HandoffSignal<E, A>>())

          function enqueue(last: Chunk<A>, __tsplusTrace?: string) {
            return grafter(Clock.sleep(duration).as(last).fork).map((fiber) => consumer(new Previous(fiber)))
          }

          const producer: Channel<
            R,
            E,
            Chunk<A>,
            unknown,
            E,
            never,
            unknown
          > = Channel.readWithCause(
            (input: Chunk<A>) =>
              input.last.fold(
                producer,
                (last) =>
                  Channel.fromEffect(
                    handoff.offer(HandoffSignal.Emit(Chunk.single(last)))
                  ) > producer
              ),
            (cause) => Channel.fromEffect(handoff.offer(HandoffSignal.Halt(cause))),
            () =>
              Channel.fromEffect(
                handoff.offer(HandoffSignal.End(SinkEndReason.UpstreamEnd))
              )
          )

          function consumer(
            state: DebounceState<E, A>,
            __tsplusTrace?: string
          ): Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown> {
            return Channel.unwrap(() => {
              switch (state._tag) {
                case "NotStarted": {
                  return handoff.take.map((signal) => {
                    switch (signal._tag) {
                      case "Emit": {
                        return Channel.unwrap(enqueue(signal.elements))
                      }
                      case "Halt": {
                        return Channel.failCause(signal.error)
                      }
                      case "End": {
                        return Channel.unit
                      }
                    }
                  })
                }
                case "Current": {
                  return state.fiber.join.map((signal) => {
                    switch (signal._tag) {
                      case "Emit": {
                        return Channel.unwrap(enqueue(signal.elements))
                      }
                      case "Halt": {
                        return Channel.failCause(signal.error)
                      }
                      case "End": {
                        return Channel.unit
                      }
                    }
                  })
                }
                case "Previous": {
                  return state.fiber.join.raceWith(
                    handoff.take,
                    (exit, current) =>
                      exit.fold(
                        (cause) => current.interrupt.as(Channel.failCause(cause)),
                        (chunk) =>
                          Effect.succeedNow(
                            Channel.write(chunk) > consumer(new Current(current))
                          )
                      ),
                    (exit, previous) =>
                      exit.fold(
                        (cause) => previous.interrupt.as(Channel.failCause(cause)),
                        (signal) => {
                          switch (signal._tag) {
                            case "Emit": {
                              return previous.interrupt > enqueue(signal.elements)
                            }
                            case "Halt": {
                              return previous.interrupt.as(Channel.failCause(signal.error))
                            }
                            case "End": {
                              return previous
                                .join
                                .map((chunk) => Channel.write(chunk) > Channel.unit)
                            }
                          }
                        }
                      )
                  )
                }
              }
            })
          }

          concreteStream(self)

          return (
            Stream.scoped((self.channel >> producer).runScoped.fork) >
              new StreamInternal(consumer(new NotStarted()))
          )
        })
      )
    )
}
