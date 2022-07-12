import type * as D from "@effect/core/testing/TestClock/Data"
import type * as S from "@effect/core/testing/TestClock/Sleep"

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
 * For example, here is how we can test `ZIO#timeout` using `TestClock`:
 *
 * {{{
 *   import zio.ZIO
 *   import zio.test.TestClock
 *
 *   for {
 *     fiber  <- ZIO.sleep(5.minutes).timeout(1.minute).fork
 *     _      <- TestClock.adjust(1.minute)
 *     result <- fiber.join
 *   } yield result == None
 * }}}
 *
 * Note how we forked the fiber that `sleep` was invoked on. Calls to `sleep`
 * and methods derived from it will semantically block until the time is set to
 * on or after the time they are scheduled to run. If we didn't fork the fiber
 * on which we called sleep we would never get to set the time on the line
 * below. Thus, a useful pattern when using `TestClock` is to fork the effect
 * being tested, then adjust the clock time, and finally verify that the
 * expected effects have been performed.
 *
 * For example, here is how we can test an effect that recurs with a fixed
 * delay:
 *
 * {{{
 *   import zio.Queue
 *   import zio.test.TestClock
 *
 *   for {
 *     q <- Queue.unbounded[Unit]
 *     _ <- q.offer(()).delay(60.minutes).forever.fork
 *     a <- q.poll.map(_.isEmpty)
 *     _ <- TestClock.adjust(60.minutes)
 *     b <- q.take.as(true)
 *     c <- q.poll.map(_.isEmpty)
 *     _ <- TestClock.adjust(60.minutes)
 *     d <- q.take.as(true)
 *     e <- q.poll.map(_.isEmpty)
 *   } yield a && b && c && d && e
 * }}}
 *
 * Here we verify that no effect is performed before the recurrence period, that
 * an effect is performed after the recurrence period, and that the effect is
 * performed exactly once. The key thing to note here is that after each
 * recurrence the next recurrence is scheduled to occur at the appropriate time
 * in the future, so when we adjust the clock by 60 minutes exactly one value is
 * placed in the queue, and when we adjust the clock by another 60 minutes
 * exactly one more value is placed in the queue.
 *
 * @tsplus type effect/core/testing/TestClock
 */
export interface TestClock extends Clock {
  readonly adjust: (duration: Duration) => Effect<never, never, void>
  readonly adjustWith: (duration: Duration) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  readonly setTime: (time: number) => Effect<never, never, void>
  readonly save: Effect<never, never, Effect<never, never, void>>
  readonly sleeps: Effect<never, never, List<number>>
}

export declare namespace TestClock {
  export type Data = D.Data
  export type Sleep = S.Sleep
}

/**
 * @tsplus type effect/core/testing/TestClock.Ops
 */
export interface TestClockOps {
  readonly Tag: Tag<TestClock>
}
export const TestClock: TestClockOps = {
  Tag: Tag<TestClock>()
}
