import * as E from "../../../data/Either"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect with the value on the left part.
 *
 * @ets static ets/EffectOps left
 */
export function left<A>(value: A, __etsTrace?: string): UIO<E.Either<A, never>> {
  return Effect.succeed(() => E.left(value))
}
