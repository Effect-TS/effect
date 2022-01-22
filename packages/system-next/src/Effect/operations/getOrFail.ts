import { NoSuchElementException } from "../../GlobalExceptions"
import type * as O from "../../Option"
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
  __trace?: string
): IO<NoSuchElementException, A> {
  return getOrFailWith_(v, () => new NoSuchElementException(), __trace)
}
