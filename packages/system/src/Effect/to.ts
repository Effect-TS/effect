// tracing: off

import { done } from "../Promise/done"
import type { Promise } from "../Promise/promise"
import { chain_, result } from "./core"
import type { Effect } from "./effect"
import { uninterruptibleMask } from "./interruption"

/**
 * Returns an effect that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 *
 * @dataFirst to_
 */
export function to<E, A>(p: Promise<E, A>, __trace?: string) {
  return <R>(effect: Effect<R, E, A>): Effect<R, never, boolean> =>
    to_(effect, p, __trace)
}

/**
 * Returns an effect that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export function to_<R, E, A>(
  effect: Effect<R, E, A>,
  p: Promise<E, A>,
  __trace?: string
): Effect<R, never, boolean> {
  return uninterruptibleMask(
    ({ restore }) => chain_(result(restore(effect)), (x) => done(x)(p)),
    __trace
  )
}
