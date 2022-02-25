import { none } from "../../../io/Trace"
import { Cause } from "../../Cause"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @tsplus static ets/EffectOps failNow
 */
export function failNow<E>(e: E, __tsplusTrace?: string): IO<E, never> {
  return Effect.failCauseNow(Cause.fail(e, none))
}
