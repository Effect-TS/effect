import * as T from "./deps"
import { makeReserve } from "./makeReserve"
import { Reservation } from "./reservation"

/**
 * Lifts a pure `Reservation<S, R, E, A>` into `Managed<S, R, E, A>`. The acquisition step
 * is performed interruptibly.
 */
export const reserve = <S, R, E, A>(reservation: Reservation<S, R, E, A>) =>
  makeReserve(T.succeedNow(reservation))
