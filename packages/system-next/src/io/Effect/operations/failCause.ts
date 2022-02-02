import type { LazyArg } from "../../../data/Function"
import type { Cause } from "../../Cause"
import type { IO } from "../definition"
import { IFail } from "../definition"

/**
 * Returns an effect that models failure with the specified `Cause`.
 *
 * @tsplus static ets/EffectOps failCause
 */
export function failCause<E>(f: LazyArg<Cause<E>>, __etsTrace?: string): IO<E, never> {
  return new IFail(f, __etsTrace)
}
