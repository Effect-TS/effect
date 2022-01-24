import * as O from "../../../data/Option"
import type { UIO } from "../definition"
import { succeed } from "./succeed"

/**
 * Returns an effect with the optional value.
 *
 * @ets static ets/EffectOps some
 */
export function some<A>(a: A, __etsTrace?: string): UIO<O.Option<A>> {
  return succeed(() => O.some(a), __etsTrace)
}
