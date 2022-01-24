import type { Promise } from "../../Promise"
import { done_ } from "../../Promise/operations/done"
import type { Effect, RIO } from "../definition"
import { chain_ } from "./chain"
import { exit } from "./exit"
import { uninterruptibleMask } from "./interruption"

/**
 * Returns an effect that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 *
 * @ets fluent ets/Effect intoPromise
 */
export function intoPromise_<R, E, A>(
  self: Effect<R, E, A>,
  promise: Promise<E, A>,
  __etsTrace?: string
): RIO<R, boolean> {
  return uninterruptibleMask(
    ({ restore }) => chain_(exit(restore(self)), (_) => done_(promise, _)),
    __etsTrace
  )
}

/**
 * Returns an effect that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 *
 * @ets_data_first intoPromise_
 */
export function intoPromise<E, A>(promise: Promise<E, A>, __etsTrace?: string) {
  return <R>(self: Effect<R, E, A>): RIO<R, boolean> =>
    intoPromise_(self, promise, __etsTrace)
}
