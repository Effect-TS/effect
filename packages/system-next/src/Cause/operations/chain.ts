// ets_tracing: off

import type { Cause } from "../definition"
import { Both, Die, empty, Interrupt, Stackless, Then } from "../definition"
import { fold_ } from "./fold"
import { traced_ } from "./traced"

/**
 * Transforms each error value in this cause to a new cause with the specified
 * function and then flattens the nested causes into a single cause.
 */
export function chain_<E, E1>(self: Cause<E>, f: (e: E) => Cause<E1>): Cause<E1> {
  return fold_(
    self,
    () => empty,
    (e, trace) => traced_(f(e), trace),
    (d, trace) => new Die(d, trace),
    (fiberId, trace) => new Interrupt(fiberId, trace),
    (left, right) => new Then(left, right),
    (left, right) => new Both(left, right),
    (cause, stackless) => new Stackless(cause, stackless)
  )
}

/**
 * Transforms each error value in this cause to a new cause with the specified
 * function and then flattens the nested causes into a single cause.
 *
 * @ets_data_first chain_
 */
export function chain<E, E1>(f: (e: E) => Cause<E1>) {
  return (self: Cause<E>): Cause<E1> => chain_(self, f)
}
