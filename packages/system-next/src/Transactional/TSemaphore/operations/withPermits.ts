import type { Effect } from "../../../Effect"
import { ensuring_ } from "../../../Effect/operations/ensuring"
import { uninterruptibleMask } from "../../../Effect/operations/interruption"
import { zipRight_ } from "../../../Effect/operations/zipRight"
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
  self: Effect<R, E, A>,
  semaphore: TSemaphore,
  permits: number,
  __trace?: string
): Effect<R, E, A> {
  return uninterruptibleMask(
    ({ restore }) =>
      zipRight_(
        restore(STM.commit(acquireN_(semaphore, permits))),
        ensuring_(restore(self), STM.commit(releaseN_(semaphore, permits)))
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
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    withPermits_(self, semaphore, permits, __trace)
}
