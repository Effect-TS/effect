import * as O from "../../../data/Option"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect with the optional value.
 *
 * @tsplus static ets/EffectOps some
 */
export function some<A>(a: A, __etsTrace?: string): UIO<O.Option<A>> {
  return Effect.succeed(() => O.some(a))
}
