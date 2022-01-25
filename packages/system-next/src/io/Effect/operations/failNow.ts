import { none } from "../../../io/Trace"
import { Fail } from "../../Cause"
import type { IO } from "../definition"
import { failCause } from "./failCause"

/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @ets static ets/EffectOps failNow
 */
export function failNow<E>(e: E, __etsTrace?: string): IO<E, never> {
  return failCause(new Fail(e, none), __etsTrace)
}
