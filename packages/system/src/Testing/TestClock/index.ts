// ets_tracing: off

import { Tagged, TaggedADT } from "../../Case/index.js"
import * as ClockId from "../../Clock/id.js"
import * as Clock from "../../Clock/index.js"
import * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import * as HashMap from "../../Collections/Immutable/HashMap/index.js"
import * as List from "../../Collections/Immutable/List/index.js"
import * as SortedSet from "../../Collections/Immutable/SortedSet/index.js"
import * as Tuple from "../../Collections/Immutable/Tuple/index.js"
import * as T from "../../Effect/index.js"
import * as Fiber from "../../Fiber/index.js"
import { identity, pipe } from "../../Function/index.js"
import type { Has } from "../../Has/index.js"
import { tag } from "../../Has/index.js"
import * as L from "../../Layer/index.js"
import * as M from "../../Managed/index.js"
import * as O from "../../Option/index.js"
import * as Ord from "../../Ord/index.js"
import * as Promise from "../../Promise/index.js"
import * as Ref from "../../Ref/index.js"
import * as RefM from "../../RefM/index.js"
import * as St from "../../Structural/index.js"
import { Annotations } from "../Annotations/index.js"
import { fiberSet } from "../FiberSet/index.js"
import { Live } from "../Live/index.js"
import type { Restorable } from "../Restorable/index.js"
import { fibers } from "../TestAnnotation/index.js"

export interface DurationBrand {
  readonly DurationBrand: unique symbol
}

export type Duration = number & DurationBrand

export function Duration(n: number): Duration {
  return n as Duration
}

/**
 * `TestClock` makes it easy to deterministically and efficiently test
 * effects involving the passage of time.
 *
 * Instead of waiting for actual time to pass, `sleep` and methods
 * implemented in terms of it schedule effects to take place at a given clock
 * time. Users can adjust the clock time using the `adjust` and `setTime`
 * methods, and all effects scheduled to take place on or before that time
 * will automatically be run in order.
 *
 * For example, here is how we can test `ZIO#timeout` using `TestClock:
 *
 * {{{
 *  import zio.ZIO
 *  import zio.duration._
 *  import zio.test.environment.TestClock
 *
 *  for {
 *    fiber  <- ZIO.sleep(5.minutes).timeout(1.minute).fork
 *    _      <- TestClock.adjust(1.minute)
 *    result <- fiber.join
 *  } yield result == None
 * }}}
 *
 * Note how we forked the fiber that `sleep` was invoked on. Calls to `sleep`
 * and methods derived from it will semantically block until the time is set
 * to on or after the time they are scheduled to run. If we didn't fork the
 * fiber on which we called sleep we would never get to set the time on the
 * line below. Thus, a useful pattern when using `TestClock` is to fork the
 * effect being tested, then adjust the clock time, and finally verify that
 * the expected effects have been performed.
 *
 * For example, here is how we can test an effect that recurs with a fixed
 * delay:
 *
 * {{{
 *  import zio.Queue
 *  import zio.duration._
 *  import zio.test.environment.TestClock
 *
 *  for {
 *    q <- Queue.unbounded[Unit]
 *    _ <- q.offer(()).delay(60.minutes).forever.fork
 *    a <- q.poll.map(_.isEmpty)
 *    _ <- TestClock.adjust(60.minutes)
 *    b <- q.take.as(true)
 *    c <- q.poll.map(_.isEmpty)
 *    _ <- TestClock.adjust(60.minutes)
 *    d <- q.take.as(true)
 *    e <- q.poll.map(_.isEmpty)
 *  } yield a && b && c && d && e
 * }}}
 *
 * Here we verify that no effect is performed before the recurrence period,
 * that an effect is performed after the recurrence period, and that the
 * effect is performed exactly once. The key thing to note here is that after
 * each recurrence the next recurrence is scheduled to occur at the
 * appropriate time in the future, so when we adjust the clock by 60 minutes
 * exactly one value is placed in the queue, and when we adjust the clock by
 * another 60 minutes exactly one more value is placed in the queue.
 */
export interface TestClock extends Restorable {
  readonly serviceId: Clock.ClockId
  readonly adjust: (duration: number) => T.UIO<void>
  readonly setTime: (duration: number) => T.UIO<void>
  readonly sleeps: T.UIO<List.List<Duration>>
}

export const TestClock = tag<TestClock>(Clock.ClockId)

/**
 * `Data` represents the state of the `TestClock`, including the clock time
 */
export class Data extends Tagged("Data")<{
  readonly duration: Duration
  readonly sleeps: List.List<Tuple.Tuple<[Duration, Promise.Promise<never, void>]>>
}> {}

/**
 * `WarningData` describes the state of the warning message that is
 * displayed if a test is using time by is not advancing the `TestClock`.
 * The possible states are `Start` if a test has not used time, `Pending`
 * if a test has used time but has not adjusted the `TestClock`, and `Done`
 * if a test has adjusted the `TestClock` or the warning message has
 * already been displayed.
 */
export type WarningData = Start | Done | Pending

export class Start extends TaggedADT<WarningData>()("Start")<{}> {}

export class Done extends TaggedADT<WarningData>()("Done")<{}> {}

export class Pending extends TaggedADT<WarningData>()("Pending")<{
  readonly fiber: Fiber.Fiber<never, void>
}> {}

export class Test implements TestClock {
  readonly serviceId: Clock.ClockId = ClockId.ClockId

  constructor(
    readonly clockState: Ref.Ref<Data>,
    readonly live: Live,
    readonly annotations: Annotations,
    readonly warningState: RefM.RefM<WarningData>
  ) {}

  /**
   * Increments the current clock time by the specified duration. Any
   * effects that were scheduled to occur on or before the new time will be
   * run in order.
   */
  readonly adjust: (duration: number) => T.UIO<void> = (duration) => {
    return T.zipRight_(
      this.warningDone,
      this.run((_) => Duration(_ + duration))
    )
  }

  /**
   * Returns the current clock time.
   */
  readonly currentTime: T.UIO<Duration> = pipe(
    Ref.get(this.clockState),
    T.map((d) => d.duration)
  )

  /**
   * Saves the `TestClock`'s current state in an effect which, when run,
   * will restore the `TestClock` state to the saved state
   */
  readonly save: T.UIO<T.UIO<void>> = pipe(
    T.do,
    T.bind("clockData", () => Ref.get(this.clockState)),
    T.map(({ clockData }) => Ref.set_(this.clockState, clockData))
  )

  /**
   * Sets the current clock time to the specified time in terms of duration
   * since the epoch. Any effects that were scheduled to occur on or before
   * the new time will immediately be run in order.
   */
  readonly setTime: (duration: number) => T.UIO<void> = (dateTime) =>
    pipe(this.warningDone, T.zipRight(this.run(() => Duration(dateTime))))

  /**
   * Semantically blocks the current fiber until the clock time is equal
   * to or greater than the specified duration. Once the clock time is
   * adjusted to on or after the duration, the fiber will automatically be
   * resumed.
   */
  readonly sleep: (duration: Duration) => T.UIO<void> = (duration) =>
    pipe(
      T.do,
      T.bind("promise", () => Promise.make<never, void>()),
      T.bind("shouldAwait", ({ promise }) =>
        pipe(
          this.clockState,
          Ref.modify((data) => {
            const end = Duration(data.duration + duration)

            if (end > data.duration) {
              return Tuple.tuple(
                true,
                data.copy({
                  sleeps: pipe(data.sleeps, List.prepend(Tuple.tuple(end, promise)))
                })
              )
            } else {
              return Tuple.tuple(false, data)
            }
          })
        )
      ),
      T.tap(({ promise, shouldAwait }) =>
        shouldAwait
          ? pipe(this.warningStart, T.zipRight(Promise.await(promise)))
          : Promise.succeed_(promise, void 0)
      ),
      T.map(() => void 0)
    )

  /**
   * Returns a list of the times at which all queued effects are scheduled
   * to resume.
   */
  readonly sleeps: T.UIO<List.List<Duration>> = pipe(
    this.clockState,
    Ref.get,
    T.map((d) =>
      pipe(
        d.sleeps,
        List.map((_) => _.get(0))
      )
    )
  )

  /**
   * The warning message that will be displayed if a test is using time but
   * is not advancing the `TestClock`.
   */
  private warning =
    "Warning: A test is using time, but is not advancing the test clock, " +
    "which may result in the test hanging. Use TestClock.adjust to " +
    "manually advance the time."

  /**
   * Forks a fiber that will display a warning message if a test is using
   * time but is not advancing the `TestClock`.
   */
  private warningStart: T.UIO<void> = pipe(
    this.warningState,
    RefM.updateSome((_) => {
      switch (_._tag) {
        case "Start": {
          return pipe(
            T.do,
            T.bind("fiber", () =>
              this.live.provide(
                pipe(
                  T.succeedWith(() => {
                    console.log(this.warning)
                  }),
                  T.delay(5_000),
                  T.interruptible,
                  T.fork
                )
              )
            ),
            T.map(({ fiber }) => Pending.make({ fiber })),
            O.some
          )
        }
        default:
          return O.none
      }
    })
  )

  /**
   * Cancels the warning message that is displayed if a test is using time
   * but is not advancing the `TestClock`.
   */
  readonly warningDone: T.UIO<void> = pipe(
    this.warningState,
    RefM.updateSome((_) => {
      switch (_._tag) {
        case "Start": {
          return O.some(T.succeed(Done.make()))
        }
        case "Pending": {
          return pipe(_.fiber, Fiber.interrupt, T.as(Done.make()), O.some)
        }
        default:
          return O.none
      }
    })
  )

  /**
   * Returns a set of all fibers in this test.
   */
  readonly supervisedFibers: T.UIO<
    SortedSet.SortedSet<Fiber.Runtime<unknown, unknown>>
  > = T.descriptorWith((d) =>
    pipe(
      this.annotations.get(fibers),
      T.chain((fa) => {
        switch (fa._tag) {
          case "Left": {
            return T.succeed(fiberSet)
          }
          case "Right": {
            return pipe(
              fa.right,
              T.forEach((ref) => T.succeedWith(() => ref.get)),
              T.map(Chunk.reduce(fiberSet, SortedSet.union_)),
              T.map(SortedSet.filter((_) => !St.equals(_.id, d.id)))
            )
          }
        }
      })
    )
  )

  /**
   * Captures a "snapshot" of the identifier and status of all fibers in
   * this test other than the current fiber. Fails with the `Unit` value if
   * any of these fibers are not done or suspended. Note that because we
   * cannot synchronize on the status of multiple fibers at the same time
   * this snapshot may not be fully consistent.
   */
  readonly freeze: T.IO<void, HashMap.HashMap<Fiber.FiberID, Fiber.Status>> = pipe(
    this.supervisedFibers,
    T.chain(
      T.reduce(HashMap.make<Fiber.FiberID, Fiber.Status>(), (map, fiber) =>
        pipe(
          fiber.status,
          T.chain((status) => {
            switch (status._tag) {
              case "Done": {
                return T.succeed(HashMap.set_(map, fiber.id, status))
              }
              case "Suspended": {
                return T.succeed(HashMap.set_(map, fiber.id, status))
              }
              default:
                return T.fail(void 0)
            }
          })
        )
      )
    )
  )

  /**
   * Delays for a short period of time.
   */
  readonly delay = this.live.provide(T.sleep(5))

  /**
   * Returns whether all descendants of this fiber are done or suspended.
   */
  readonly suspended: T.IO<void, HashMap.HashMap<Fiber.FiberID, Fiber.Status>> = pipe(
    this.freeze,
    T.zip(pipe(this.delay, T.zipRight(this.freeze))),
    T.chain(({ tuple: [first, last] }) =>
      St.equals(first, last) ? T.succeed(first) : T.fail<void>(void 0)
    )
  )

  /**
   * Polls until all descendants of this fiber are done or suspended.
   */
  readonly awaitSuspended: T.UIO<void> = pipe(
    this.suspended,
    T.zipWith(
      pipe(this.live.provide(T.sleep(10)), T.zipRight(this.suspended)),
      St.equals
    ),
    T.filterOrFail(identity, () => void 0 as void),
    T.eventually,
    T.asUnit
  )

  /**
   * Runs all effects scheduled to occur on or before the specified
   * duration, which may depend on the current time, in order.
   */
  private run: (f: (d: Duration) => Duration) => T.UIO<void> = (f) =>
    pipe(
      this.awaitSuspended,
      T.zipRight(
        pipe(
          this.clockState,
          Ref.modify((data) => {
            const end = f(data.duration)
            const sorted = List.sortWith_(
              data.sleeps,
              Ord.contramap_(Ord.number, (_) => _.get(0))
            )
            if (!List.isEmpty(sorted)) {
              const {
                tuple: [duration, promise]
              } = List.unsafeFirst(sorted)!

              const sleeps = List.tail(sorted)

              if (duration <= end) {
                return Tuple.tuple(
                  O.some(Tuple.tuple(end, promise)),
                  new Data({ duration, sleeps })
                )
              }
            }
            return Tuple.tuple(O.none, new Data({ duration: end, sleeps: data.sleeps }))
          }),
          T.chain((o) => {
            switch (o._tag) {
              case "None": {
                return T.unit
              }
              case "Some": {
                return pipe(
                  Promise.succeed_(o.value.get(1), void 0),
                  T.zipRight(T.yieldNow),
                  T.zipRight(this.run(() => o.value.get(0)))
                )
              }
            }
          })
        )
      )
    )
}

export function live(data: Data) {
  return M.gen(function* (_) {
    const live = yield* _(Live)
    const annotations = yield* _(Annotations)
    const ref = yield* _(Ref.makeRef(data))
    const refM = yield* _(RefM.makeRefM<WarningData>(Start.make()))

    const test = yield* _(
      T.succeedWith(() => new Test(ref, live, annotations, refM))["|>"](
        M.make((_) => _.warningDone)
      )
    )

    const testClock = TestClock.has(test)

    return testClock as Has<Clock.Clock> & Has<TestClock>
  })["|>"](L.fromRawManaged)
}

export const defaultTestClock = live(
  new Data({
    duration: Duration(0),
    sleeps: List.empty()
  })
)
