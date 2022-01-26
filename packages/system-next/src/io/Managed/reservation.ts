import type { Effect, RIO } from "../Effect"
import type { Exit } from "../Exit"

/**
 * A `Reservation<R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 *
 * See `Managed#reserve` and `Effect#reserve` for details of usage.
 */
export class Reservation<R, E, A> {
  constructor(
    readonly acquire: Effect<R, E, A>,
    readonly release: (exit: Exit<any, any>) => RIO<R, any>
  ) {}
}
