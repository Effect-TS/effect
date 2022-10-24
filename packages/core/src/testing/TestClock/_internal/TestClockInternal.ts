import { LiveClock } from "@effect/core/io/Clock"
import type { Live } from "@effect/core/testing/Live"
import { SuspendedWarningData } from "@effect/core/testing/TestClock/_internal/SuspendedWarningData"
import { WarningData } from "@effect/core/testing/TestClock/_internal/WarningData"
import * as Order from "@fp-ts/core/typeclass/Order"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Duration from "@fp-ts/data/Duration"
import * as Equal from "@fp-ts/data/Equal"
import { identity, pipe } from "@fp-ts/data/Function"
import * as HashMap from "@fp-ts/data/HashMap"
import * as List from "@fp-ts/data/List"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as number from "@fp-ts/data/Number"
import * as Option from "@fp-ts/data/Option"
import * as SortedSet from "@fp-ts/data/SortedSet"

/**
 * The warning message that will be displayed if a test is using time but is
 * not advancing the `TestClock`.
 *
 * @internal
 */
export const warning = "Warning: A test is using time, but is not advancing " +
  "the test clock, which may result in the test hanging. Use TestClock.adjust to " +
  "manually advance the time."

/**
 * The warning message that will be displayed if a test is advancing the clock
 * but a fiber is still running.
 *
 * @internal
 */
export const suspendedWarning = "Warning: A test is advancing the test clock, " +
  "but a fiber is not suspending, which may result in the test hanging. Use " +
  "TestAspect.diagnose to identity the fiber that is not suspending."

/** @internal */
export class TestClockInternal extends LiveClock {
  constructor(
    readonly clockState: Ref<TestClock.Data>,
    readonly live: Live,
    readonly annotations: Annotations,
    readonly warningState: Ref.Synchronized<WarningData>,
    readonly suspendedWarningState: Ref.Synchronized<SuspendedWarningData>
  ) {
    super()
  }

  /**
   * Returns the current clock time in milliseconds.
   */
  get currentTime(): Effect<never, never, number> {
    return this.clockState.get.map((data) => data.instant)
  }

  /**
   * Saves the `TestClock`'s current state in an effect which, when run, will
   * restore the `TestClock` state to the saved state
   */
  get save(): Effect<never, never, Effect<never, never, void>> {
    return this.clockState.get.map((data) => this.clockState.set(data))
  }

  /**
   * Sets the current clock time to the specified instant. Any effects that
   * were scheduled to occur on or before the new time will be run in order.
   */
  setTime(instant: number): Effect<never, never, void> {
    return this.warningDone.zipRight(this.run(() => instant))
  }

  /**
   * Semantically blocks the current fiber until the clock time is equal to or
   * greater than the specified duration. Once the clock time is adjusted to
   * on or after the duration, the fiber will automatically be resumed.
   */
  sleep(duration: Duration.Duration): Effect<never, never, void> {
    return Deferred.make<never, void>().flatMap((deferred) =>
      this.clockState.modify((data) => {
        const end = data.instant + duration.millis
        if (end > data.instant) {
          return [
            true,
            TestClock.Data(
              data.instant,
              pipe(data.sleeps, List.prepend([end, deferred] as const))
            )
          ]
        }
        return [false, data]
      }).flatMap((shouldAwait) =>
        shouldAwait ?
          this.warningStart.zipRight(deferred.await) :
          deferred.succeed(undefined)
      )
    ).unit
  }

  /**
   * Returns a list of the times at which all queued effects are scheduled to
   * resume.
   */
  get sleeps(): Effect<never, never, List.List<number>> {
    return this.clockState.get.map((data) => pipe(data.sleeps, List.map((_) => _[0])))
  }

  /**
   * Increments the current clock time by the specified duration. Any effects
   * that were scheduled to occur on or before the new time will be run in
   * order.
   */
  adjust(duration: Duration.Duration): Effect<never, never, void> {
    return this.warningDone.zipRight(this.run((n) => n + duration.millis))
  }

  /**
   * Increments the current clock time by the specified duration. Any effects
   * that were scheduled to occur on or before the new time will be run in
   * order.
   */
  adjustWith(duration: Duration.Duration) {
    return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
      effect.zipParLeft(
        this.adjust(duration)
      )
  }

  /**
   * Returns a set of all fibers in this test.
   */
  get supervisedFibers(): Effect<
    never,
    never,
    SortedSet.SortedSet<Fiber.Runtime<unknown, unknown>>
  > {
    return Effect.descriptorWith((descriptor) =>
      this.annotations.get(TestAnnotation.fibers).flatMap((either) => {
        switch (either._tag) {
          case "Left": {
            return Effect.succeed(SortedSet.empty(Fiber.Order))
          }
          case "Right": {
            return Effect
              .forEach(either.right, (ref) => Effect.sync(MutableRef.get(ref)))
              .map(Chunk.reduce(
                SortedSet.empty(Fiber.Order),
                (a, b) => pipe(a, SortedSet.union(b))
              ))
              .map(SortedSet.filter((fiber) => !Equal.equals(fiber.id, descriptor.id)))
          }
        }
      })
    )
  }

  /**
   * Captures a "snapshot" of the identifier and status of all fibers in this
   * test other than the current fiber. Fails with the `Unit` value if any of
   * these fibers are not done or suspended. Note that because we cannot
   * synchronize on the status of multiple fibers at the same time this
   * snapshot may not be fully consistent.
   */
  private get freeze(): Effect<never, void, HashMap.HashMap<FiberId, Fiber.Status>> {
    return this.supervisedFibers.flatMap((fibers) =>
      Effect.reduce(
        fibers,
        HashMap.empty<FiberId, Fiber.Status>(),
        (map, fiber) =>
          fiber.status.flatMap((status) => {
            switch (status._tag) {
              case "Done": {
                return Effect.succeed(
                  pipe(map, HashMap.set(fiber.id as FiberId, status as Fiber.Status))
                )
              }
              case "Suspended": {
                return Effect.succeed(
                  pipe(map, HashMap.set(fiber.id as FiberId, status as Fiber.Status))
                )
              }
              default: {
                return Effect.fail(undefined)
              }
            }
          })
      )
    )
  }

  /**
   * Forks a fiber that will display a warning message if a test is using time
   * but is not advancing the `TestClock`.
   */
  private get warningStart(): Effect<never, never, void> {
    return this.warningState.updateSomeEffect((data) =>
      data._tag === "Start" ?
        Option.some(
          this.live.provide(Effect.logWarning(warning).delay(Duration.seconds(5)))
            .interruptible
            .fork
            .map((fiber) => WarningData.Pending(fiber))
        ) :
        Option.none
    )
  }

  /**
   * Cancels the warning message that is displayed if a test is using time but
   * is not advancing the `TestClock`.
   */
  get warningDone(): Effect<never, never, void> {
    return this.warningState.updateSomeEffect((warningData) => {
      switch (warningData._tag) {
        case "Start": {
          return Option.some(Effect.succeed(WarningData.Done))
        }
        case "Pending": {
          return Option.some(warningData.fiber.interrupt.as(WarningData.Done))
        }
        default: {
          return Option.none
        }
      }
    })
  }

  /**
   * Returns whether all descendants of this fiber are done or suspended.
   */
  private get suspended(): Effect<never, void, HashMap.HashMap<FiberId, Fiber.Status>> {
    return this.freeze
      .zip(this.live.provide(Effect.sleep(Duration.millis(5))).zipRight(this.freeze))
      .flatMap(([first, last]) =>
        Equal.equals(first, last) ?
          Effect.succeed(first) :
          Effect.fail(void 0)
      )
  }

  /**
   * Polls until all descendants of this fiber are done or suspended.
   */
  private get awaitSuspended(): Effect<never, never, void> {
    return this.suspendedWarningStart.zipRight(
      this.suspended
        .zipWith(
          this.live.provide(Effect.sleep(Duration.millis(10)))
            .zipRight(this.suspended),
          Equal.equals
        )
        .filterOrFail(identity, undefined)
        .eventually
    ).zipRight(this.suspendedWarningDone)
  }

  /**
   * Forks a fiber that will display a warning message if a test is advancing
   * the `TestClock` but a fiber is not suspending.
   */
  private get suspendedWarningStart(): Effect<never, never, void> {
    return this.suspendedWarningState.updateSomeEffect((suspendedWarningData) =>
      suspendedWarningData._tag === "Start" ?
        Option.some(
          this.live.provide(
            Effect.logWarning(suspendedWarning)
              .zipRight(this.suspendedWarningState.set(SuspendedWarningData.Done))
              .delay(Duration.seconds(5))
          )
            .interruptible
            .fork
            .map((fiber) => SuspendedWarningData.Pending(fiber))
        ) :
        Option.none
    )
  }

  /**
   * Cancels the warning message that is displayed if a test is advancing the
   * `TestClock` but a fiber is not suspending.
   */
  get suspendedWarningDone() {
    return this.suspendedWarningState.updateSomeEffect((suspendedWarningData) =>
      suspendedWarningData._tag === "Pending" ?
        Option.some(
          suspendedWarningData.fiber.interrupt.as(SuspendedWarningData.Start)
        ) :
        Option.none
    )
  }

  /**
   * Runs all effects scheduled to occur on or before the specified instant,
   * which may depend on the current time, in order.
   */
  private run(f: (instant: number) => number): Effect<never, never, void> {
    return this.awaitSuspended.zipRight(
      this.clockState.modify((data) => {
        const end = f(data.instant)
        const sorted = pipe(
          data.sleeps,
          List.sortWith(pipe(
            number.Order,
            Order.contramap((_) => _[0])
          ))
        )
        if (List.isCons(sorted)) {
          const [instant, deferred] = sorted.head
          if (instant <= end) {
            return [
              Option.some([end, deferred] as const),
              TestClock.Data(instant, sorted.tail)
            ] as const
          }
        }
        return [Option.none, TestClock.Data(end, data.sleeps)] as const
      }).flatMap((maybe) => {
        switch (maybe._tag) {
          case "None": {
            return Effect.unit
          }
          case "Some": {
            const [end, deferred] = maybe.value
            return deferred.succeed(undefined)
              .zipRight(Effect.yieldNow)
              .zipRight(this.run(() => end))
          }
        }
      })
    )
  }
}
