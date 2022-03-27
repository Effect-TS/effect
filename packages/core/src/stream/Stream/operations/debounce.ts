import { Chunk } from "../../../collection/immutable/Chunk"
import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import { Clock } from "../../../io/Clock"
import { Effect } from "../../../io/Effect"
import type { Fiber } from "../../../io/Fiber"
import { Channel } from "../../Channel"
import { Stream } from "../definition"
import { SinkEndReason } from "../SinkEndReason"
import { Handoff } from "./_internal/Handoff"
import { HandoffSignal } from "./_internal/HandoffSignal"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

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
  constructor(readonly fiber: Fiber<E, HandoffSignal<void, E, A>>) {}
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
 * @tsplus fluent ets/Stream debounce
 */
export function debounce_<R, E, A>(
  self: Stream<R, E, A>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R & HasClock, E, A> {
  return Stream.unwrap(
    Effect.Do()
      .bind("duration", () => Effect.succeed(duration))
      .bind("scope", () => Effect.forkScope)
      .bind("handoff", () => Handoff.make<HandoffSignal<void, E, A>>())
      .map(({ duration, handoff, scope }) => {
        function enqueue(last: Chunk<A>, __tsplusTrace?: string) {
          return Clock.sleep(duration)
            .as(last)
            .forkIn(scope)
            .map((fiber) => consumer(new Previous(fiber)))
        }

        const producer: Channel<
          R & HasClock,
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
        ): Channel<R & HasClock, unknown, unknown, unknown, E, Chunk<A>, unknown> {
          return Channel.unwrap(() => {
            switch (state._tag) {
              case "NotStarted": {
                return handoff.take().map((signal) => {
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
                return state.fiber.join().map((signal) => {
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
                return state.fiber.join().raceWith(
                  handoff.take(),
                  (exit, current) =>
                    exit.fold(
                      (cause) => current.interrupt().as(Channel.failCause(cause)),
                      (chunk) =>
                        Effect.succeedNow(
                          Channel.write(chunk) > consumer(new Current(current))
                        )
                    ),
                  (exit, previous) =>
                    exit.fold(
                      (cause) => previous.interrupt().as(Channel.failCause(cause)),
                      (signal) => {
                        switch (signal._tag) {
                          case "Emit": {
                            return previous.interrupt() > enqueue(signal.elements)
                          }
                          case "Halt": {
                            return previous
                              .interrupt()
                              .as(Channel.failCause(signal.error))
                          }
                          case "End": {
                            return previous
                              .join()
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
          Stream.managed((self.channel >> producer).runManaged().fork()) >
          new StreamInternal(consumer(new NotStarted()))
        )
      })
  )
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
 */
export const debounce = Pipeable(debounce_)
