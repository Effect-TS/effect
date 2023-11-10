/**
 * @since 2.0.0
 */
import type { Chunk } from "./Chunk.js"
import type { Clock } from "./Clock.js"
import type { Duration } from "./Duration.js"
import type { Effect } from "./Effect.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/TestClock.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/TestClock.js"

/**
 * @since 2.0.0
 */
export declare namespace TestClock {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TestClock.js"
}
/**
 * A `TestClock` makes it easy to deterministically and efficiently test effects
 * involving the passage of time.
 *
 * Instead of waiting for actual time to pass, `sleep` and methods implemented
 * in terms of it schedule effects to take place at a given clock time. Users
 * can adjust the clock time using the `adjust` and `setTime` methods, and all
 * effects scheduled to take place on or before that time will automatically be
 * run in order.
 *
 * For example, here is how we can test `Effect.timeout` using `TestClock`:
 *
 * ```ts
 * import { Duration } from "effect/Duration"
 * import { Effect } from "effect/Effect"
 * import { Fiber } from "effect/Fiber"
 * import { TestClock } from "effect/TestClock"
 * import { Option } from "effect/Option"
 *
 * Effect.gen(function*() {
 *   const fiber = yield* pipe(
 *     Effect.sleep(Duration.minutes(5)),
 *     Effect.timeout(Duration.minutes(1)),
 *     Effect.fork
 *   )
 *   yield* TestClock.adjust(Duration.minutes(1))
 *   const result = yield* Fiber.join(fiber)
 *   assert.deepStrictEqual(result, Option.none())
 * })
 * ```
 *
 * Note how we forked the fiber that `sleep` was invoked on. Calls to `sleep`
 * and methods derived from it will semantically block until the time is set to
 * on or after the time they are scheduled to run. If we didn't fork the fiber
 * on which we called sleep we would never get to set the time on the line
 * below. Thus, a useful pattern when using `TestClock` is to fork the effect
 * being tested, then adjust the clock time, and finally verify that the
 * expected effects have been performed.
 *
 * @since 2.0.0
 */
export interface TestClock extends Clock {
  adjust(duration: Duration.DurationInput): Effect<never, never, void>
  adjustWith(duration: Duration.DurationInput): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  save(): Effect<never, never, Effect<never, never, void>>
  setTime(time: number): Effect<never, never, void>
  sleeps(): Effect<never, never, Chunk<number>>
}
