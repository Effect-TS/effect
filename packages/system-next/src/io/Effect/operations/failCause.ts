import type { Cause } from "../../Cause"
import type { IO } from "../definition"
import { IFail } from "../definition"

// TODO(Mike/Max): fix name

/**
 * Returns an effect that models failure with the specified `Cause`.
 *
 * @tsplus static ets/EffectOps failCauseNow
 */
export function failCause<E>(cause: Cause<E>, __etsTrace?: string): IO<E, never> {
  return new IFail(() => cause, __etsTrace)
}
