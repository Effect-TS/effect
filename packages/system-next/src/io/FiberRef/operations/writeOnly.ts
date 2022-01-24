import * as E from "../../../data/Either"
import { constVoid, identity } from "../../../data/Function"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Returns a write only view of the `XFiberRef`.
 */
export function writeOnly<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>
): XFiberRef<EA, void, A, never> {
  concreteUnified(self)
  return self.fold(identity, constVoid, E.right, () => E.left(undefined))
}
