// ets_tracing: off

import type { Effect, RIO } from "./operations/_internal/effect"
import type { Exit } from "./operations/_internal/exit"

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
