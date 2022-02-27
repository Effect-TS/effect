import { Either } from "../../../data/Either"
import { constVoid, identity } from "../../../data/Function"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Returns a write only view of the `XFiberRef`.
 *
 * @tsplus fluent ets/XFiberRef writeOnly
 * @tsplus fluent ets/XFiberRefRuntime writeOnly
 */
export function writeOnly<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>
): XFiberRef<EA, void, A, never> {
  concreteUnified(self)
  return self._fold(identity, constVoid, Either.right, () => Either.left(undefined))
}
