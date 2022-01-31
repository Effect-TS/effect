import * as Cause from "../../Cause"
import { Effect } from "../definition"

/**
 * Converts all failures to unchecked exceptions.
 *
 * @tsplus fluent ets/Effect orDieKeep
 */
export function orDieKeep<R, E, A>(effect: Effect<R, E, A>, __etsTrace?: string) {
  return effect.foldCauseEffect(
    (ce) => Effect.failCauseNow(Cause.chain_(ce, Cause.die)),
    Effect.succeedNow,
    __etsTrace
  )
}
