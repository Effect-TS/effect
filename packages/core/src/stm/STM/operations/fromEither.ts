import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Lifts an `Either` into a `STM`.
 *
 * @tsplus static ets/STMOps fromEither
 */
export function fromEither<E, A>(e: LazyArg<Either<E, A>>): STM<unknown, E, A> {
  return STM.suspend(() => {
    return e().fold(STM.failNow, STM.succeedNow)
  })
}
