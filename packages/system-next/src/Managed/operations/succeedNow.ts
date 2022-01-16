// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as Finalizer from "../ReleaseMap/finalizer"
import * as T from "./_internal/effect"

/**
 * Lifts a pure value into a `Managed`.
 */
export function succeedNow<A>(a: A, __trace?: string): Managed<unknown, never, A> {
  return managedApply(T.succeedNow(Tp.tuple(Finalizer.noopFinalizer, a)))
}
