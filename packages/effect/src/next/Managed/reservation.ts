import * as T from "./deps"

/**
 * A `Reservation<S, R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 *
 * See `Managed#reserve` and `ZIO#reserve` for details of usage.
 */
export class Reservation<S, R, E, A> {
  static of = <S, R, E, A, S2, R2>(
    acquire: T.Effect<S, R, E, A>,
    release: (exit: T.Exit<any, any>) => T.Effect<S2, R2, never, any>
  ) => new Reservation<S | S2, R & R2, E, A>(acquire, release)

  private constructor(
    readonly acquire: T.Effect<S, R, E, A>,
    readonly release: (exit: T.Exit<any, any>) => T.Effect<S, R, never, any>
  ) {}
}

/**
 * Make a new reservation
 */
export const makeReservation_ = <S, R, E, A, S2, R2>(
  acquire: T.Effect<S, R, E, A>,
  release: (exit: T.Exit<any, any>) => T.Effect<S2, R2, never, any>
) => Reservation.of(acquire, release)

/**
 * Make a new reservation
 */
export const makeReservation = <S2, R2>(
  release: (exit: T.Exit<any, any>) => T.Effect<S2, R2, never, any>
) => <S, R, E, A>(acquire: T.Effect<S, R, E, A>) => Reservation.of(acquire, release)
