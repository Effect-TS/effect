// ets_tracing: off

import * as T from "../../../Effect"
import * as STM from "../../STM"
import type { TSemaphore } from "../definition"
import { acquireN_ } from "./acquireN"
import { releaseN_ } from "./releaseN"

/**
 * Executes the specified effect, acquiring the specified number of permits
 * immediately before the effect begins execution and releasing them
 * immediately after the effect completes execution, whether by success,
 * failure, or interruption.
 */
export function withPermits_<R, E, A>(
  self: T.Effect<R, E, A>,
  semaphore: TSemaphore,
  permits: number,
  __trace?: string
): T.Effect<R, E, A> {
  return T.uninterruptibleMask(
    ({ restore }) =>
      T.zipRight_(
        restore(STM.commit(acquireN_(semaphore, permits))),
        T.ensuring_(restore(self), STM.commit(releaseN_(semaphore, permits)))
      ),
    __trace
  )
}

/**
 * Executes the specified effect, acquiring the specified number of permits
 * immediately before the effect begins execution and releasing them
 * immediately after the effect completes execution, whether by success,
 * failure, or interruption.
 *
 * @ets_data_first withPermits_
 */
export function withPermits(semaphore: TSemaphore, permits: number, __trace?: string) {
  return <R, E, A>(self: T.Effect<R, E, A>): T.Effect<R, E, A> =>
    withPermits_(self, semaphore, permits, __trace)
}
