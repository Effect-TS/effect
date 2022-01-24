import * as E from "../../../data/Either"
import type { Predicate, Refinement } from "../../../data/Function"
import { identity } from "../../../data/Function"
import * as O from "../../../data/Option"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Filters the `get` value of the `XFiberRef` with the specified predicate,
 * returning a `XFiberRef` with a `get` value that succeeds if the predicate
 * is satisfied or else fails with `None`.
 */
export function filterOutput_<EA, EB, A, B, C extends B>(
  self: XFiberRef<EA, EB, A, B>,
  f: Refinement<B, C>
): XFiberRef<EA, O.Option<EB>, A, C>
export function filterOutput_<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  f: Predicate<B>
): XFiberRef<EA, O.Option<EB>, A, B>
export function filterOutput_<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  f: Predicate<B>
): XFiberRef<EA, O.Option<EB>, A, B> {
  concreteUnified(self)
  return self.fold(identity, O.some, E.right, (b) =>
    f(b) ? E.right(b) : E.left(O.none)
  )
}

/**
 * Filters the `get` value of the `XFiberRef` with the specified predicate,
 * returning a `XFiberRef` with a `get` value that succeeds if the predicate
 * is satisfied or else fails with `None`.
 *
 * @ets_data_first filterOutput_
 */
export function filterOutput<B, C extends B>(
  f: Refinement<B, C>
): <EA, EB, A>(self: XFiberRef<EA, EB, A, B>) => XFiberRef<EA, O.Option<EB>, A, C>
export function filterOutput<B>(
  f: Predicate<B>
): <EA, EB, A>(self: XFiberRef<EA, EB, A, B>) => XFiberRef<EA, O.Option<EB>, A, B>
export function filterOutput<B>(f: Predicate<B>) {
  return <EA, EB, A>(
    self: XFiberRef<EA, EB, A, B>
  ): XFiberRef<EA, O.Option<EB>, A, B> => filterOutput_(self, f)
}
