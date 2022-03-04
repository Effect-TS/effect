import { Either } from "../../../data/Either"
import type { USTM } from "../definition"
import { STM } from "../definition"

/**
 * Returns an effect with the value on the right part.
 *
 * @tsplus static ets/STMOps right
 */
export function succeedRight<A>(value: A): USTM<Either<never, A>> {
  return STM.succeed(Either.right(value))
}
