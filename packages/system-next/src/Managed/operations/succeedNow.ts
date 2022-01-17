import * as Tp from "../../Collections/Immutable/Tuple"
import { succeedNow as effectSucceedNow } from "../../Effect/operations/succeedNow"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as Finalizer from "../ReleaseMap/finalizer"

/**
 * Lifts a pure value into a `Managed`.
 */
export function succeedNow<A>(a: A, __trace?: string): Managed<unknown, never, A> {
  return managedApply(effectSucceedNow(Tp.tuple(Finalizer.noopFinalizer, a)))
}
