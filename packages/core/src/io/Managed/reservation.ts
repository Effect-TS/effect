import type { Effect, RIO } from "../Effect"
import type { Exit } from "../Exit"

/**
 * A `Reservation<R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 *
 * See `Managed.reserve` and `Effect.reserve` for details of usage.
 *
 * @tsplus type ets/Reservation
 */
export interface Reservation<R, E, A> {
  readonly acquire: Effect<R, E, A>
  readonly release: (exit: Exit<any, any>) => RIO<R, any>
}

export class ReservationImpl<R, E, A> implements Reservation<R, E, A> {
  constructor(
    readonly acquire: Effect<R, E, A>,
    readonly release: (exit: Exit<any, any>) => RIO<R, any>
  ) {}
}

/**
 * @tsplus type ets/ReservationOps
 */
export interface ReservationOps {}
export const Reservation: ReservationOps = {}

/**
 * A `Reservation<R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 *
 * See `Managed.reserve` and `Effect.reserve` for details of usage.
 *
 * @tsplus static ets/ReservationOps __call
 */
export function reservationApply<R, E, A>(
  acquire: Effect<R, E, A>,
  release: (exit: Exit<any, any>) => RIO<R, any>
): Reservation<R, E, A> {
  return new ReservationImpl(acquire, release)
}
