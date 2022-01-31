import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import type { Managed } from "../definition"
import type { Reservation } from "../reservation"
import { fromReservationEffect } from "./fromReservationEffect"

/**
 * Lifts a pure `Reservation<R, E, A>` into `Managed<R, E, A>`. The
 * acquisition step is performed interruptibly.
 *
 * @ets static ets/ManagedOps fromReservation
 */
export function fromReservation<R, E, A>(
  reservation: LazyArg<Reservation<R, E, A>>,
  __etsTrace?: string
): Managed<R, E, A> {
  return fromReservationEffect(Effect.succeed(reservation))
}
