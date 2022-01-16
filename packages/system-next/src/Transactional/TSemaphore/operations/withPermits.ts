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
  self: TSemaphore,
  permits: number,
  effect: T.Effect<R, E, A>,
  __trace?: string
): T.Effect<R, E, A> {
  return T.uninterruptibleMask(
    ({ restore }) =>
      T.zipRight_(
        restore(STM.commit(acquireN_(self, permits))),
        T.ensuring_(restore(effect), STM.commit(releaseN_(self, permits)))
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
export function withPermits<R, E, A>(
  permits: number,
  effect: T.Effect<R, E, A>,
  __trace?: string
) {
  return (self: TSemaphore): T.Effect<R, E, A> =>
    withPermits_(self, permits, effect, __trace)
}
