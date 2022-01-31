// ets_tracing: off

import type { Cause } from "../Cause/index.js"
import { failureOrCause } from "../Cause/index.js"
import * as E from "../Either/index.js"
import { pipe } from "../Function/index.js"
import { bracketExit_ } from "./bracketExit.js"
import { unit } from "./core.js"
import type { Effect, RIO } from "./effect.js"

/**
 * Runs the specified effect if this effect is terminated, either because of
 * a defect or because of interruption.
 */
export function onTermination_<R1, R, E, A, X>(
  self: Effect<R, E, A>,
  cleanup: (_: Cause<never>) => RIO<R1, X>,
  __trace?: string
): Effect<R & R1, E, A> {
  return bracketExit_(
    unit,
    () => self,
    (_, eb): RIO<R1, X | void> => {
      switch (eb._tag) {
        case "Success": {
          return unit
        }
        case "Failure": {
          return pipe(
            failureOrCause(eb.cause),
            E.fold(() => unit, cleanup)
          )
        }
      }
    },
    __trace
  )
}

/**
 * Runs the specified effect if this effect is terminated, either because of
 * a defect or because of interruption.
 *
 * @ets_data_first onTermination_
 */
export function onTermination<R1, R, E, A, X>(
  cleanup: (_: Cause<never>) => RIO<R1, X>,
  __trace?: string
): (self: Effect<R, E, A>) => Effect<R & R1, E, A> {
  return (self) => onTermination_(self, cleanup, __trace)
}
