import * as E from "../../../data/Either"
import type { UIO } from "../definition"
import { succeed } from "./succeed"

/**
 * Returns an effect with the value on the right part.
 *
 * @ets static ets/EffectOps right
 */
export function right<A>(value: A, __etsTrace?: string): UIO<E.Either<never, A>> {
  return succeed(() => E.right(value))
}
