import { done } from "../Promise/done"
import type { Promise } from "../Promise/promise"
import { chain_, result } from "./core"
import type { Effect } from "./effect"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Returns an effect that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export const to = <E, A>(p: Promise<E, A>) => <R>(
  effect: Effect<R, E, A>
): Effect<R, never, boolean> =>
  uninterruptibleMask(({ restore }) =>
    chain_(result(restore(effect)), (x) => done(x)(p))
  )
