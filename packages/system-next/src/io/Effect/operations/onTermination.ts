import * as E from "../../../data/Either"
import type { Cause } from "../../Cause"
import { failureOrCause } from "../../Cause"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Runs the specified effect if this effect is terminated, either because of a
 * defect or because of interruption.
 *
 * @ets fluent ets/Effect onTermination
 */
export function onTermination_<R, E, A, R2, X>(
  self: Effect<R, E, A>,
  cleanup: (cause: Cause<never>) => RIO<R2, X>,
  __etsTrace?: string
): Effect<R & R2, E, A> {
  return Effect.unit.acquireReleaseExitWith(
    () => self,
    (_, exit): RIO<R2, X | void> =>
      exit._tag === "Failure"
        ? E.fold_(failureOrCause(exit.cause), () => Effect.unit, cleanup)
        : Effect.unit
  )
}

/**
 * Runs the specified effect if this effect is terminated, either because of a
 * defect or because of interruption.
 *
 * @ets_data_first onTermination_
 */
export function onTermination<R2, X>(
  cleanup: (cause: Cause<never>) => RIO<R2, X>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E, A> =>
    onTermination_(self, cleanup)
}
