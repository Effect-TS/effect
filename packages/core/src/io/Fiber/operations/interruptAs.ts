import { realFiber } from "@effect/core/io/Fiber/definition"

/**
 * A fiber that is already interrupted.
 *
 * @tsplus static effect/core/io/Fiber.Ops interruptAs
 * @category interruption
 * @since 1.0.0
 */
export function interruptAs(fiberId: FiberId): Fiber<never, never> {
  return Fiber.done(Exit.interrupt(fiberId))
}

/**
 * Interrupts the fiber as if interrupted from the specified fiber. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 *
 * @tsplus static effect/core/io/Fiber.Aspects interruptAs
 * @tsplus static effect/core/io/RuntimeFiber.Aspects interruptAs
 * @tsplus pipeable effect/core/io/Fiber interruptAs
 * @tsplus pipeable effect/core/io/RuntimeFiber interruptAs
 * @category interruption
 * @since 1.0.0
 */
export function interruptAsNow(fiberId: FiberId) {
  return <E, A>(self: Fiber<E, A>): Effect<never, never, Exit<E, A>> => {
    realFiber(self)
    return self.interruptAsFork(fiberId).flatMap(() => self.await)
  }
}

/**
 * Interrupts the fiber as if interrupted from the specified fiber. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 *
 * @tsplus static effect/core/io/Fiber.Aspects interruptAsFork
 * @tsplus static effect/core/io/RuntimeFiber.Aspects interruptAsFork
 * @tsplus pipeable effect/core/io/Fiber interruptAsFork
 * @tsplus pipeable effect/core/io/RuntimeFiber interruptAsFork
 * @category interruption
 * @since 1.0.0
 */
export function interruptAsFork(fiberId: FiberId) {
  return <E, A>(self: Fiber<E, A>): Effect<never, never, void> => {
    realFiber(self)
    return self.interruptAsFork(fiberId)
  }
}
