import { constVoid } from "../../../data/Function"
import type * as O from "../../../data/Option"
import type { IO } from "../definition"
import { Effect } from "../definition"

// TODO(Mike/Max): fix name

/**
 * Lifts an `Option` into a `IO`, if the option is not defined it fails with
 * `void`.
 *
 * @ets static ets/EffectOps getOrFailDiscard
 */
export function getOrFailUnit<A>(v: O.Option<A>, __etsTrace?: string): IO<void, A> {
  return Effect.getOrFailWith(v, constVoid)
}
