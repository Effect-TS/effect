import type { Cause } from "../Cause"
import { failureOrCause } from "../Cause"
import * as E from "../Either"
import { pipe } from "../Function"
import { bracketExit_ } from "./bracketExit_"
import { unit } from "./core"
import type { Effect, RIO } from "./effect"

/**
 * Runs the specified effect if this effect is terminated, either because of
 * a defect or because of interruption.
 */
export function onTermination_<R1, R, E, A>(
  self: Effect<R, E, A>,
  cleanup: (_: Cause<never>) => RIO<R1, any>
): Effect<R & R1, E, A> {
  return bracketExit_(
    unit,
    () => self,
    (_, eb) => {
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
    }
  )
}

/**
 * Runs the specified effect if this effect is terminated, either because of
 * a defect or because of interruption.
 */
export function onTermination<R1, R, E, A>(
  cleanup: (_: Cause<never>) => RIO<R1, any>
): (self: Effect<R, E, A>) => Effect<R & R1, E, A> {
  return (self) => onTermination_(self, cleanup)
}
