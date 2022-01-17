import * as Tp from "../../Collections/Immutable/Tuple"
import type { LazyArg } from "../../Function"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as Finalizer from "../ReleaseMap/finalizer"
import * as T from "./_internal/effect"

/**
 * Lifts a lazy pure value into a `Managed`.
 */
export function succeed<A>(
  f: LazyArg<A>,
  __trace?: string
): Managed<unknown, never, A> {
  return managedApply(T.succeed(() => Tp.tuple(Finalizer.noopFinalizer, f())))
}
