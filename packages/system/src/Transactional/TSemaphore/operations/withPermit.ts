// ets_tracing: off

import type { Effect } from "../../../Effect"
import type { TSemaphore } from "../definition"
import { withPermits_ } from "./withPermits"

/**
 * Executes the specified effect, acquiring a permit immediately before the
 * effect begins execution and releasing it immediately after the effect
 * completes execution, whether by success, failure, or interruption.
 */
export function withPermit_<R, E, A>(
  self: Effect<R, E, A>,
  semaphore: TSemaphore,
  __trace?: string
): Effect<R, E, A> {
  return withPermits_(self, semaphore, 1, __trace)
}

/**
 * Executes the specified effect, acquiring a permit immediately before the
 * effect begins execution and releasing it immediately after the effect
 * completes execution, whether by success, failure, or interruption.
 *
 * @ets_data_first withPermit_
 */
export function withPermit(semaphore: TSemaphore, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    withPermit_(self, semaphore, __trace)
}
