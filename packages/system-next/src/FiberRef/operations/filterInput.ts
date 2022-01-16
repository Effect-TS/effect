// ets_tracing: off

import * as E from "../../Either"
import type { Predicate, Refinement } from "../../Function"
import { identity } from "../../Function"
import * as O from "../../Option"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Filters the `set` value of the `XFiberRef` with the specified predicate,
 * returning a `XFiberRef` with a `set` value that succeeds if the predicate
 * is satisfied or else fails with `None`.
 */
export function filterInput_<EA, EB, A, B, C extends A>(
  self: XFiberRef<EA, EB, A, B>,
  f: Refinement<A, C>
): XFiberRef<O.Option<EA>, EB, C, B>
export function filterInput_<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  f: Predicate<A>
): XFiberRef<O.Option<EA>, EB, A, B>
export function filterInput_<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  f: Predicate<A>
): XFiberRef<O.Option<EA>, EB, A, B> {
  concreteUnified(self)
  return self.fold(
    O.some,
    identity,
    (a) => (f(a) ? E.right(a) : E.left(O.none)),
    E.right
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
): <EA, EB, B>(self: XFiberRef<EA, EB, A, B>) => XFiberRef<O.Option<EA>, EB, C, B>
export function filterInput<A>(
  f: Predicate<A>
): <EA, EB, B>(self: XFiberRef<EA, EB, A, B>) => XFiberRef<O.Option<EA>, EB, A, B>
export function filterInput<A>(f: Predicate<A>) {
  return <EA, EB, B>(
    self: XFiberRef<EA, EB, A, B>
  ): XFiberRef<O.Option<EA>, EB, A, B> => filterInput_(self, f)
}
