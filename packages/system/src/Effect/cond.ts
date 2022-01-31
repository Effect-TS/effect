// ets_tracing: off

import { chain_, succeedWith, suspend } from "./core.js"
import type { Effect, RIO } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Evaluate the predicate,
 * return the given A as success if predicate returns true,
 * and the given E as error otherwise
 *
 * @ets_data_first cond_
 */
export function cond<E, A>(onTrue: () => A, onFalse: () => E, __trace?: string) {
  return (b: boolean): Effect<unknown, E, A> => cond_(b, onTrue, onFalse, __trace)
}

/**
 * Evaluate the predicate,
 * return the given A as success if predicate returns true,
 * and the given E as error otherwise
 */
export function cond_<E, A>(
  b: boolean,
  onTrue: () => A,
  onFalse: () => E,
  __trace?: string
): Effect<unknown, E, A> {
  return condM_(b, succeedWith(onTrue), succeedWith(onFalse), __trace)
}

/**
 * Evaluate the predicate,
 * return the given A as success if predicate returns true,
 * and the given E as error otherwise
 */
export function condM_<R, R2, E, A>(
  b: boolean,
  onTrue: RIO<R, A>,
  onFalse: RIO<R2, E>,
  __trace?: string
): Effect<R & R2, E, A> {
  return suspend(
    (): Effect<R & R2, E, A> => (b ? onTrue : chain_(onFalse, (x) => fail(x))),
    __trace
  )
}

/**
 * Evaluate the predicate,
 * return the given A as success if predicate returns true,
 * and the given E as error otherwise
 */
export function condM<R, R2, E, A>(
  onTrue: RIO<R, A>,
  onFalse: RIO<R2, E>,
  __trace?: string
): (b: boolean) => Effect<R & R2, E, A> {
  return (b) => condM_(b, onTrue, onFalse, __trace)
}
