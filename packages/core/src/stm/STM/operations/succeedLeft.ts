import { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { USTM } from "../definition"
import { STM } from "../definition"

/**
 * Returns an effect with the value on the left part.
 *
 * @tsplus static ets/STMOps left
 */
export function succeedLeft<A>(value: LazyArg<A>): USTM<Either<A, never>> {
  return STM.succeed(Either.left(value()))
}
