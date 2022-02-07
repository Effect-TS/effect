// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as E from "../../Either/index.js"
import * as Ex from "../../Exit/index.js"
import { pipe } from "../../Function/index.js"
import type { Has } from "../../Has/index.js"
import * as O from "../../Option/index.js"
import * as SC from "../../Schedule/index.js"
import * as T from "../_internal/effect.js"
import * as F from "../_internal/fiber.js"
import * as M from "../_internal/managed.js"
import * as R from "../_internal/ref.js"
import * as Handoff from "../Handoff/index.js"
import type * as Pull from "../Pull/index.js"
import * as Take from "../Take/index.js"
import type * as TR from "../Transducer/index.js"
import { Stream } from "./definitions.js"
import { flattenTake } from "./flattenTake.js"

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
  schedule: SC.Schedule<R1, A.Chunk<P>, Q>
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
  schedule: SC.Schedule<R1, A.Chunk<P>, Q>
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
    M.bind("lastChunk", () => R.makeManagedRef<A.Chunk<P>>(A.empty())),
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
            O.none as O.Option<F.Fiber<never, Ex.Exit<O.Option<E | E1>, A.Chunk<O>>>>
          ),
          T.chain(
            O.fold(
              () => Handoff.take(handoff),
              (fiber) => F.join(fiber)
            )
          )
        )

        return pipe(
          raceNextTime.get,
          T.chain((x) =>
            go<R, E, O, R1, E1, P, Q>(
              waitForProducer,
              push,
              lastChunk,
              raceNextTime,
              updateSchedule,
              sdriver,
              waitingFiber,
              x
            )
          ),
          T.onInterrupt((_) =>
            T.chain_(waitingFiber.get, (x) =>
              pipe(
                x,
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

function go<R, E, O, R1, E1, P, Q>(
  waitForProducer: T.RIO<R1, Take.Take<E | E1, O>>,
  push: (c: O.Option<A.Chunk<O>>) => T.Effect<R1, E1, A.Chunk<P>>,
  lastChunk: R.Ref<A.Chunk<P>>,
  raceNextTime: R.Ref<boolean>,
  updateSchedule: T.RIO<R1 & Has<CL.Clock>, O.Option<Q>>,
  sdriver: SC.Driver<Has<CL.Clock> & R1, A.Chunk<P>, Q>,
  waitingFiber: R.Ref<O.Option<F.Fiber<never, Take.Take<E | E1, O>>>>,
  race: boolean
): T.Effect<
  R & R1 & CL.HasClock,
  O.Option<E | E1>,
  A.Chunk<Take.Take<E1, E.Either<Q, P>>>
> {
  if (!race) {
    return pipe(
      waitForProducer,
      T.chain((x) => handleTake(push, lastChunk, x)),
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
                        lastChunk.set(A.empty()),
                        T.zipRight(T.orDie(sdriver.last)),
                        T.zipLeft(sdriver.reset)
                      )
                    ),
                    T.let(
                      "scheduleResult",
                      ({ lastQ }): Take.Take<E1, E.Either<Q, P>> =>
                        Ex.succeed(A.single(E.left(lastQ)))
                    ),
                    T.bind("take", () =>
                      pipe(
                        push(O.none),
                        T.asSomeError,
                        Take.fromPull,
                        T.tap((x) => updateLastChunk(lastChunk, x))
                      )
                    ),
                    T.tap(() => raceNextTime.set(false)),
                    T.tap(() => waitingFiber.set(O.some(producerWaiting))),
                    T.map(({ scheduleResult, take }) =>
                      A.from([scheduleResult, Take.map_(take, E.right)])
                    )
                  ),
                (_) =>
                  pipe(
                    T.do,
                    T.bind("ps", () =>
                      pipe(
                        push(O.none),
                        T.asSomeError,
                        Take.fromPull,
                        T.tap((x) => updateLastChunk(lastChunk, x))
                      )
                    ),
                    T.tap(() => raceNextTime.set(false)),
                    T.tap(() => waitingFiber.set(O.some(producerWaiting))),
                    T.map(({ ps }) => A.from([Take.map_(ps, E.right)]))
                  )
              )
            )
          ),
        (producerDone, scheduleWaiting) =>
          T.zipRight_(
            F.interrupt(scheduleWaiting),
            handleTake(push, lastChunk, Ex.flatten(producerDone))
          )
      )
    )
  }
}

function handleTake<E, O, R1, E1, P>(
  push: (c: O.Option<A.Chunk<O>>) => T.Effect<R1, E1, A.Chunk<P>>,
  lastChunk: R.Ref<A.Chunk<P>>,
  take: Take.Take<E | E1, O>
): Pull.Pull<R1, E | E1, Take.Take<E1, E.Either<never, P>>> {
  return pipe(
    take,
    Take.foldM(
      () =>
        pipe(
          push(O.none),
          T.map((ps) => A.from([Take.chunk(A.map_(ps, E.right)), Take.end]))
        ),
      T.halt,
      (os) =>
        T.chain_(Take.fromPull(T.asSomeError(push(O.some(os)))), (take) =>
          T.as_(updateLastChunk(lastChunk, take), A.single(Take.map_(take, E.right)))
        )
    ),
    T.mapError(O.some)
  )
}

function updateLastChunk<E1, P>(
  lastChunk: R.Ref<A.Chunk<P>>,
  take: Take.Take<E1, P>
): T.UIO<void> {
  return Take.tap_(take, lastChunk.set)
}
