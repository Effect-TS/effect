import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Managed } from "../definition"
import * as Finalizer from "../ReleaseMap/finalizer"

/**
 * Lifts a lazy pure value into a `Managed`.
 *
 * @ets static ets/ManagedOps succeed
 */
export function succeed<A>(
  f: LazyArg<A>,
  __etsTrace?: string
): Managed<unknown, never, A> {
  return Managed(Effect.succeed(Tuple(Finalizer.noopFinalizer, f())))
}
