import { Option } from "../../../data/Option"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect with the optional value.
 *
 * @tsplus static ets/EffectOps some
 */
export function succeedSome<A>(a: A, __etsTrace?: string): UIO<Option<A>> {
  return Effect.succeed(Option.some(a))
}
