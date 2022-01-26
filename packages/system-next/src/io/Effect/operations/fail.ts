import type { LazyArg } from "../../../data/Function"
import { none } from "../../../io/Trace"
import { Fail } from "../../Cause"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @ets static ets/EffectOps fail
 */
export function fail<E>(f: LazyArg<E>, __etsTrace?: string): IO<E, never> {
  return Effect.failCause(() => new Fail(f(), none))
}
