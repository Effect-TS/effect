import type { Cause } from "../../Cause"
import type { IO } from "../definition"
import { IFail } from "../definition"

// TODO(Mike/Max): fix name

/**
 * Returns an effect that models failure with the specified `Cause`.
 *
 * @tsplus static ets/EffectOps failCause
 */
export function failCauseWith<E>(f: () => Cause<E>, __etsTrace?: string): IO<E, never> {
  return new IFail(f, __etsTrace)
}
