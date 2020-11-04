import type { RIO } from "."
import { chain_, effectTotal } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Evaluate the predicate,
 * return the given A as success if predicate returns true,
 * and the given E as error otherwise
 */
export function cond<E, A>(onTrue: () => A, onFalse: () => E) {
  return (b: boolean): Effect<unknown, E, A> => cond_(b, onTrue, onFalse)
}

/**
 * Evaluate the predicate,
 * return the given A as success if predicate returns true,
 * and the given E as error otherwise
 */
export function cond_<E, A>(
  b: boolean,
  onTrue: () => A,
  onFalse: () => E
): Effect<unknown, E, A> {
  return b ? effectTotal(onTrue) : chain_(effectTotal(onFalse), fail)
}

/**
 * Evaluate the predicate,
 * return the given A as success if predicate returns true,
 * and the given E as error otherwise
 */
export function condM_<R, R2, E, A>(
  b: boolean,
  onTrue: RIO<R, A>,
  onFalse: RIO<R2, E>
): Effect<R & R2, E, A> {
  return b ? onTrue : chain_(onFalse, fail)
}

/**
 * Evaluate the predicate,
 * return the given A as success if predicate returns true,
 * and the given E as error otherwise
 */
export function condM<R, R2, E, A>(
  onTrue: RIO<R, A>,
  onFalse: RIO<R2, E>
): (b: boolean) => Effect<R & R2, E, A> {
  return (b) => condM_(b, onTrue, onFalse)
}
