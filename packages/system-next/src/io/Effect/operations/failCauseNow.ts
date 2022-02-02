import type { Cause } from "../../Cause"
import type { IO } from "../definition"
import { IFail } from "../definition"

/**
 * Returns an effect that models failure with the specified `Cause`.
 *
 * @tsplus static ets/EffectOps failCauseNow
 */
export function failCauseNow<E>(cause: Cause<E>, __etsTrace?: string): IO<E, never> {
  return new IFail(() => cause, __etsTrace)
}
