import * as E from "../../../data/Either"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect with the value on the right part.
 *
 * @ets static ets/EffectOps right
 */
export function right<A>(value: A, __etsTrace?: string): UIO<E.Either<never, A>> {
  return Effect.succeed(() => E.right(value))
}
