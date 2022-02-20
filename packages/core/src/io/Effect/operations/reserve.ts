import type { LazyArg } from "../../../data/Function"
import type { Reservation } from "../../Managed"
import { Managed } from "../../Managed"
import type { Effect } from "../definition"

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * However, unlike `acquireReleaseWith`, the separation of these phases allows
 * the acquisition to be interruptible.
 *
 * Useful for concurrent data structures and other cases where the
 * 'deallocator' can tell if the allocation succeeded or not just by
 * inspecting internal / external state.
 *
 * @tsplus static ets/EffectOps reserve
 */
export function reserve<R, E, A, R2, E2, A2>(
  reservation: LazyArg<Effect<R, E, Reservation<R, E, A>>>,
  use: (a: A) => Effect<R2, E2, A2>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A2> {
  return Managed.fromReservationEffect(reservation).use(use)
}
