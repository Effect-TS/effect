import { Either } from "../../../data/Either"
import type { Predicate, Refinement } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Filters the `set` value of the `XFiberRef` with the specified predicate,
 * returning a `XFiberRef` with a `set` value that succeeds if the predicate
 * is satisfied or else fails with `None`.
 *
 * @tsplus fluent ets/XFiberRef filterInput
 * @tsplus fluent ets/XFiberRefRuntime filterInput
 */
export function filterInput_<EA, EB, A, B, C extends A>(
  self: XFiberRef<EA, EB, A, B>,
  f: Refinement<A, C>
): XFiberRef<Option<EA>, EB, C, B>
export function filterInput_<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  f: Predicate<A>
): XFiberRef<Option<EA>, EB, A, B>
export function filterInput_<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  f: Predicate<A>
): XFiberRef<Option<EA>, EB, A, B> {
  concreteUnified(self)
  return self._fold(
    Option.some,
    identity,
    (a) => (f(a) ? Either.right(a) : Either.left(Option.none)),
    Either.right
  )
}

/**
 * Filters the `set` value of the `XFiberRef` with the specified predicate,
 * returning a `XFiberRef` with a `set` value that succeeds if the predicate
 * is satisfied or else fails with `None`.
 *
 * @ets_data_first filterInput_
 */
export function filterInput<A, C extends A>(
  f: Refinement<A, C>
): <EA, EB, B>(self: XFiberRef<EA, EB, A, B>) => XFiberRef<Option<EA>, EB, C, B>
export function filterInput<A>(
  f: Predicate<A>
): <EA, EB, B>(self: XFiberRef<EA, EB, A, B>) => XFiberRef<Option<EA>, EB, A, B>
export function filterInput<A>(f: Predicate<A>) {
  return <EA, EB, B>(self: XFiberRef<EA, EB, A, B>): XFiberRef<Option<EA>, EB, A, B> =>
    self.filterInput(f)
}
