import type { Cause } from "../../Cause"
import { failureOrCause } from "../../Cause"
import * as E from "../../Either"
import type { Effect, RIO } from "../definition"
import { acquireReleaseExitWith_ } from "./acquireReleaseExitWith"
import { unit } from "./unit"

/**
 * Runs the specified effect if this effect is terminated, either because of a
 * defect or because of interruption.
 */
export function onTermination_<R, E, A, R2, X>(
  self: Effect<R, E, A>,
  cleanup: (cause: Cause<never>) => RIO<R2, X>,
  __trace?: string
): Effect<R & R2, E, A> {
  return acquireReleaseExitWith_(
    unit,
    () => self,
    (_, exit): RIO<R2, X | void> =>
      exit._tag === "Failure"
        ? E.fold_(failureOrCause(exit.cause), () => unit, cleanup)
        : unit,
    __trace
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
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E, A> =>
    onTermination_(self, cleanup, __trace)
}
