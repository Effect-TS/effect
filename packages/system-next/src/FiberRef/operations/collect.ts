import * as E from "../../Either"
import { identity } from "../../Function"
import * as O from "../../Option"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Maps and filters the `get` value of the `FiberRef` with the specified
 * function, returning a `FiberRef` with a `get` value that succeeds with the
 * result of the function if it returns `Some`, or else fails with `None`.
 */
export function collect_<EA, EB, A, B, C>(
  self: XFiberRef<EA, EB, A, B>,
  pf: (b: B) => O.Option<C>
): XFiberRef<EA, O.Option<EB>, A, C> {
  concreteUnified(self)
  return self.fold(identity, O.some, E.right, (b) => E.fromOption_(pf(b), () => O.none))
}

/**
 * Maps and filters the `get` value of the `FiberRef` with the specified
 * function, returning a `FiberRef` with a `get` value that succeeds with the
 * result of the function if it returns `Some`, or else fails with `None`.
 *
 * @ets_data_first collect_
 */
export function collect<B, C>(pf: (b: B) => O.Option<C>) {
  return <EA, EB, A>(
    self: XFiberRef<EA, EB, A, B>
  ): XFiberRef<EA, O.Option<EB>, A, C> => collect_(self, pf)
}
