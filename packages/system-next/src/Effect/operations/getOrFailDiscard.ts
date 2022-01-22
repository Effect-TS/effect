import { constVoid } from "../../Function"
import type * as O from "../../Option"
import type { IO } from "../definition"
import { getOrFailWith_ } from "./getOrFailWith"

// TODO(Mike/Max): fix name

/**
 * Lifts an `Option` into a `IO`, if the option is not defined it fails with
 * `void`.
 *
 * @ets static ets/EffectOps getOrFailDiscard
 */
export function getOrFailUnit<A>(v: O.Option<A>, __trace?: string): IO<void, A> {
  return getOrFailWith_(v, constVoid, __trace)
}
