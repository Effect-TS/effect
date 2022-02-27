import type { XFiberRef, XFiberRefInternal } from "./base"
import type { Derived, DerivedAll, Runtime } from "./data"

/**
 * @tsplus macro identity
 */
export function concrete<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>
): Runtime<A | B> | Derived<EA, EB, A, A> | DerivedAll<EA, EB, A, B> {
  return self as Runtime<A | B> | Derived<EA, EB, A, A> | DerivedAll<EA, EB, A, B>
}

/**
 * @tsplus macro remove
 */
export function concreteUnified<EA, EB, A, B>(
  _: XFiberRef<EA, EB, A, B>
): asserts _ is XFiberRefInternal<EA, EB, A, B> {
  //
}
