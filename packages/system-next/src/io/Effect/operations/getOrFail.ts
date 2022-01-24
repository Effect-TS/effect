import { NoSuchElementException } from "../../../data/GlobalExceptions"
import type * as O from "../../../data/Option"
import type { IO } from "../definition"
import { getOrFailWith_ } from "./getOrFailWith"

/**
 * Lifts an `Option` into an `Effect`, if the option is not defined it fails
 * with `NoSuchElementException`.
 *
 * @ets static ets/EffectOps getOrFail
 */
export function getOrFail<A>(
  v: O.Option<A>,
  __etsTrace?: string
): IO<NoSuchElementException, A> {
  return getOrFailWith_(v, () => new NoSuchElementException(), __etsTrace)
}
