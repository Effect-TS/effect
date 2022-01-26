import * as Tp from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { Managed } from "../definition"
import * as Finalizer from "../ReleaseMap/finalizer"

/**
 * Lifts a pure value into a `Managed`.
 *
 * @ets static ets/ManagedOps succeedNow
 */
export function succeedNow<A>(a: A, __etsTrace?: string): Managed<unknown, never, A> {
  return Managed(Effect.succeedNow(Tp.tuple(Finalizer.noopFinalizer, a)))
}
