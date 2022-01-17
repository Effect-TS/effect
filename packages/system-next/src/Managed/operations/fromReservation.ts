import type { Managed } from "../definition"
import type { Reservation } from "../reservation"
import * as T from "./_internal/effect"
import { fromReservationEffect } from "./fromReservationEffect"

/**
 * Lifts a pure `Reservation<R, E, A>` into `Managed<R, E, A>`. The
 * acquisition step is performed interruptibly.
 */
export function fromReservation<R, E, A>(
  reservation: Reservation<R, E, A>,
  __trace?: string
): Managed<R, E, A> {
  return fromReservationEffect(
    T.succeed(() => reservation),
    __trace
  )
}
