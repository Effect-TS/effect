import type { LazyArg } from "../../../data/Function"
import { none } from "../../../io/Trace"
import { Cause } from "../../Cause"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @tsplus static ets/EffectOps fail
 */
export function fail<E>(f: LazyArg<E>, __etsTrace?: string): IO<E, never> {
  return Effect.failCause(Cause.fail(f(), none))
}
