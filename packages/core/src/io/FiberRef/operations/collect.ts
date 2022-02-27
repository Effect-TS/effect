import { Either } from "../../../data/Either"
import { identity } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Maps and filters the `get` value of the `FiberRef` with the specified
 * function, returning a `FiberRef` with a `get` value that succeeds with the
 * result of the function if it returns `Some`, or else fails with `None`.
 *
 * @tsplus fluent ets/XFiberRef collect
 * @tsplus fluent ets/XFiberRefRuntime collect
 */
export function collect_<EA, EB, A, B, C>(
  self: XFiberRef<EA, EB, A, B>,
  pf: (b: B) => Option<C>
): XFiberRef<EA, Option<EB>, A, C> {
  concreteUnified(self)
  return self._fold(identity, Option.some, Either.right, (b) =>
    Either.fromOption(pf(b), () => Option.none)
  )
}

/**
 * Maps and filters the `get` value of the `FiberRef` with the specified
 * function, returning a `FiberRef` with a `get` value that succeeds with the
 * result of the function if it returns `Some`, or else fails with `None`.
 *
 * @ets_data_first collect_
 */
export function collect<B, C>(pf: (b: B) => Option<C>) {
  return <EA, EB, A>(self: XFiberRef<EA, EB, A, B>): XFiberRef<EA, Option<EB>, A, C> =>
    self.collect(pf)
}
