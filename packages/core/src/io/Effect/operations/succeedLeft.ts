import { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect with the value on the left part.
 *
 * @tsplus static ets/EffectOps left
 */
export function succeedLeft<A>(
  value: LazyArg<A>,
  __tsplusTrace?: string
): UIO<Either<A, never>> {
  return Effect.succeed(Either.left(value()))
}
