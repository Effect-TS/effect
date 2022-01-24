import * as E from "../../../data/Either"
import type { UIO } from "../definition"
import { succeed } from "./succeed"

/**
 * Returns an effect with the value on the left part.
 *
 * @ets static ets/EffectOps left
 */
export function left<A>(value: A, __etsTrace?: string): UIO<E.Either<A, never>> {
  return succeed(() => E.left(value))
}
