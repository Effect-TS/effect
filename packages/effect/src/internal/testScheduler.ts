/**
 * Lets `TestClock` wait for a `TestScheduler` without importing it.
 *
 * @internal
 */
export const whenIdle: unique symbol = Symbol.for("effect/testing/TestScheduler/whenIdle")

/**
 * A scheduler that calls `f` once no task is runnable. The returned function
 * removes the waiter.
 *
 * @internal
 */
export interface IdleAware {
  [whenIdle](f: () => void): () => void
}
