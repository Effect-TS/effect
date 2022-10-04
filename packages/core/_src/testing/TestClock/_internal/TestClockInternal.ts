import { LiveClock } from "@effect/core/io/Clock"
import type { Live } from "@effect/core/testing/Live"
import { SuspendedWarningData } from "@effect/core/testing/TestClock/_internal/SuspendedWarningData"
import { WarningData } from "@effect/core/testing/TestClock/_internal/WarningData"

/**
 * The warning message that will be displayed if a test is using time but is
 * not advancing the `TestClock`.
 */
export const warning = "Warning: A test is using time, but is not advancing " +
  "the test clock, which may result in the test hanging. Use TestClock.adjust to " +
  "manually advance the time."

/**
 * The warning message that will be displayed if a test is advancing the clock
 * but a fiber is still running.
 */
export const suspendedWarning = "Warning: A test is advancing the test clock, " +
  "but a fiber is not suspending, which may result in the test hanging. Use " +
  "TestAspect.diagnose to identity the fiber that is not suspending."

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
  sleep(duration: Duration): Effect<never, never, void> {
    return Deferred.make<never, void>().flatMap((deferred) =>
      this.clockState.modify((data) => {
        const end = data.instant + duration.millis
        if (end > data.instant) {
          return [
            true,
            TestClock.Data(
              data.instant,
              data.sleeps.prepend([end, deferred])
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
  get sleeps(): Effect<never, never, List<number>> {
    return this.clockState.get.map((data) => data.sleeps.map((_) => _[0]))
  }

  /**
   * Increments the current clock time by the specified duration. Any effects
   * that were scheduled to occur on or before the new time will be run in
   * order.
   */
  adjust(duration: Duration): Effect<never, never, void> {
    return this.warningDone.zipRight(this.run((n) => n + duration.millis))
  }

  /**
   * Increments the current clock time by the specified duration. Any effects
   * that were scheduled to occur on or before the new time will be run in
   * order.
   */
  adjustWith(duration: Duration) {
    return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
      effect.zipParLeft(
        this.adjust(duration)
      )
  }

  /**
   * Returns a set of all fibers in this test.
   */
  get supervisedFibers(): Effect<never, never, SortedSet<Fiber.Runtime<unknown, unknown>>> {
    return Effect.descriptorWith((descriptor) =>
      this.annotations.get(TestAnnotation.fibers).flatMap((either) => {
        switch (either._tag) {
          case "Left": {
            return Effect.succeed(SortedSet.empty(Fiber.Ord))
          }
          case "Right": {
            return Effect
              .forEach(either.right, (ref) => Effect.sync(ref.get))
              .map((chunk) => chunk.reduce(SortedSet.empty(Fiber.Ord), (a, b) => a.union(b)))
              .map((set) => set.filter((fiber) => !(fiber.id.equals(descriptor.id))))
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
  private get freeze(): Effect<never, void, HashMap<FiberId, Fiber.Status>> {
    return this.supervisedFibers.flatMap((fibers) =>
      Effect.reduce(
        fibers,
        HashMap.empty<FiberId, Fiber.Status>(),
        (map, fiber) =>
          fiber.status.flatMap((status) => {
            switch (status._tag) {
              case "Done": {
                return Effect.succeed(map.set(fiber.id, status))
              }
              case "Suspended": {
                return Effect.succeed(map.set(fiber.id, status))
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
        Maybe.some(
          this.live.provide(Effect.logWarning(warning).delay((5).seconds))
            .interruptible
            .fork
            .map((fiber) => WarningData.Pending(fiber))
        ) :
        Maybe.none
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
          return Maybe.some(Effect.succeed(WarningData.Done))
        }
        case "Pending": {
          return Maybe.some(warningData.fiber.interrupt.as(WarningData.Done))
        }
        default: {
          return Maybe.none
        }
      }
    })
  }

  /**
   * Returns whether all descendants of this fiber are done or suspended.
   */
  private get suspended(): Effect<never, void, HashMap<FiberId, Fiber.Status>> {
    return this.freeze
      .zip(this.live.provide(Effect.sleep((5).millis)).zipRight(this.freeze))
      .flatMap(([first, last]) =>
        first.equals(last) ?
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
          this.live.provide(Effect.sleep((10).millis))
            .zipRight(this.suspended),
          (a, b) => a.equals(b)
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
        Maybe.some(
          this.live.provide(
            Effect.logWarning(suspendedWarning)
              .zipRight(this.suspendedWarningState.set(SuspendedWarningData.Done))
              .delay((5).seconds)
          )
            .interruptible
            .fork
            .map((fiber) => SuspendedWarningData.Pending(fiber))
        ) :
        Maybe.none
    )
  }

  /**
   * Cancels the warning message that is displayed if a test is advancing the
   * `TestClock` but a fiber is not suspending.
   */
  get suspendedWarningDone() {
    return this.suspendedWarningState.updateSomeEffect((suspendedWarningData) =>
      suspendedWarningData._tag === "Pending" ?
        Maybe.some(
          suspendedWarningData.fiber.interrupt.as(SuspendedWarningData.Start)
        ) :
        Maybe.none
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
        const sorted = data.sleeps.sortWith(Ord.number.contramap((_) => _[0]))
        if (sorted.isCons()) {
          const [instant, deferred] = sorted.head
          if (instant <= end) {
            return [
              Maybe.some([end, deferred] as const),
              TestClock.Data(instant, sorted.tail)
            ] as const
          }
        }
        return [Maybe.none, TestClock.Data(end, data.sleeps)] as const
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
