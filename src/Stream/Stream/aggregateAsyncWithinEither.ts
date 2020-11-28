import * as A from "../../Array"
import type * as CL from "../../Clock"
import * as E from "../../Either"
import * as Ex from "../../Exit"
import { flow, pipe } from "../../Function"
import * as O from "../../Option"
import * as SC from "../../Schedule"
import * as T from "../_internal/effect"
import * as F from "../_internal/fiber"
import * as M from "../_internal/managed"
import * as R from "../_internal/ref"
import * as Handoff from "../Handoff"
import type * as Pull from "../Pull"
import * as Take from "../Take"
import type * as TR from "../Transducer"
import { Stream } from "./definitions"
import { flattenTake } from "./flattenTake"

/**
 * Aggregates elements using the provided transducer until it signals completion, or the
 * delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Elements
 * will be aggregated by the transducer until the downstream fiber pulls the aggregated value,
 * or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays between
 * pulls.
 */
export function aggregateAsyncWithinEither<O, R1, E1, P, Q>(
  transducer: TR.Transducer<R1, E1, O, P>,
  schedule: SC.Schedule<R1, A.Array<P>, Q>
) {
  return <R, E>(self: Stream<R, E, O>) =>
    aggregateAsyncWithinEither_(self, transducer, schedule)
}

/**
 * Aggregates elements using the provided transducer until it signals completion, or the
 * delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Elements
 * will be aggregated by the transducer until the downstream fiber pulls the aggregated value,
 * or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays between
 * pulls.
 */
export function aggregateAsyncWithinEither_<R, E, O, R1, E1, P, Q>(
  self: Stream<R, E, O>,
  transducer: TR.Transducer<R1, E1, O, P>,
  schedule: SC.Schedule<R1, A.Array<P>, Q>
): Stream<R & R1 & CL.HasClock, E | E1, E.Either<Q, P>> {
  return pipe(
    M.do,
    M.bind("pull", () => self.proc),
    M.bind("push", () => transducer.push),
    M.bind("handoff", () => M.fromEffect(Handoff.make<Take.Take<E, O>>())),
    M.bind("raceNextTime", () => R.makeManagedRef(false)),
    M.bind("waitingFiber", () =>
      R.makeManagedRef<O.Option<F.Fiber<never, Take.Take<E | E1, O>>>>(O.none)
    ),
    M.bind("sdriver", () => M.fromEffect(SC.driver(schedule))),
    M.bind("lastChunk", () => R.makeManagedRef<A.Array<P>>(A.empty)),
    M.let("producer", ({ handoff, pull }) =>
      T.repeatWhileM_(Take.fromPull(pull), (take) =>
        pipe(Handoff.offer_(handoff, take), T.as(Ex.succeeded(take)))
      )
    ),
    M.let(
      "consumer",
      ({ handoff, lastChunk, push, raceNextTime, sdriver, waitingFiber }) => {
        const updateSchedule: T.RIO<R1 & CL.HasClock, O.Option<Q>> = pipe(
          lastChunk.get,
          T.chain(sdriver.next),
          T.fold((_) => O.none, O.some)
        )
        const waitForProducer: T.RIO<R1, Take.Take<E | E1, O>> = pipe(
          waitingFiber,
          R.getAndSet(
            O.none as O.Option<F.Fiber<never, Ex.Exit<O.Option<E | E1>, A.Array<O>>>>
          ),
          T.chain(
            O.fold(
              () => Handoff.take(handoff),
              (fiber) => F.join(fiber)
            )
          )
        )
        const updateLastChunk = (take: Take.Take<E1, P>): T.UIO<void> =>
          Take.tap_(take, lastChunk.set)
        const handleTake = (
          take: Take.Take<E | E1, O>
        ): Pull.Pull<R1, E | E1, Take.Take<E1, E.Either<never, P>>> =>
          pipe(
            take,
            Take.foldM(
              () =>
                pipe(
                  push(O.none),
                  T.map((ps) => [Take.chunk(A.map_(ps, E.right)), Take.end])
                ),
              T.halt,
              (os) =>
                T.chain_(Take.fromPull(T.asSomeError(push(O.some(os)))), (take) =>
                  T.as_(updateLastChunk(take), [Take.map_(take, E.right)])
                )
            ),
            T.mapError(O.some)
          )
        const go = (
          race: boolean
        ): T.Effect<
          R & R1 & CL.HasClock,
          O.Option<E | E1>,
          A.Array<Take.Take<E1, E.Either<Q, P>>>
        > => {
          if (!race) {
            return pipe(
              waitForProducer,
              T.chain(handleTake),
              T.zipLeft(raceNextTime.set(true))
            )
          } else {
            return pipe(
              T.raceWith_(
                updateSchedule,
                waitForProducer,
                (scheduleDone, producerWaiting) =>
                  pipe(
                    T.done(scheduleDone),
                    T.chain(
                      O.fold(
                        () =>
                          pipe(
                            T.do,
                            T.bind("lastQ", () =>
                              pipe(
                                lastChunk.set(A.empty),
                                T.andThen(T.orDie(sdriver.last)),
                                T.zipLeft(sdriver.reset)
                              )
                            ),
                            T.let(
                              "scheduleResult",
                              ({ lastQ }): Take.Take<E1, E.Either<Q, P>> =>
                                Ex.succeed([E.left(lastQ)])
                            ),
                            T.bind("take", () =>
                              pipe(
                                push(O.none),
                                T.asSomeError,
                                Take.fromPull,
                                T.tap(updateLastChunk)
                              )
                            ),
                            T.tap(() => raceNextTime.set(false)),
                            T.tap(() => waitingFiber.set(O.some(producerWaiting))),
                            T.map(({ scheduleResult, take }) => [
                              scheduleResult,
                              Take.map_(take, E.right)
                            ])
                          ),
                        (_) =>
                          pipe(
                            T.do,
                            T.bind("ps", () =>
                              pipe(
                                push(O.none),
                                T.asSomeError,
                                Take.fromPull,
                                T.tap(updateLastChunk)
                              )
                            ),
                            T.tap(() => raceNextTime.set(false)),
                            T.tap(() => waitingFiber.set(O.some(producerWaiting))),
                            T.map(({ ps }) => [Take.map_(ps, E.right)])
                          )
                      )
                    )
                  ),
                (producerDone, scheduleWaiting) =>
                  T.andThen_(
                    F.interrupt(scheduleWaiting),
                    handleTake(Ex.flatten(producerDone))
                  )
              )
            )
          }
        }

        return pipe(
          raceNextTime.get,
          T.chain(go),
          T.onInterrupt((_) =>
            T.chain_(
              waitingFiber.get,
              flow(
                O.map(F.interrupt),
                O.getOrElse(() => T.unit)
              )
            )
          )
        )
      }
    ),
    M.tap(({ producer }) => T.forkManaged(producer)),
    M.map(({ consumer }) => consumer),
    (m) => new Stream(m),
    flattenTake
  )
}
