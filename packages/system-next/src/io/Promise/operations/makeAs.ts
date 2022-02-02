import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { FiberId } from "../../FiberId"
import { Promise } from "../definition"

/**
 * Makes a new promise to be completed by the fiber with the specified id.
 *
 * @tsplus static ets/PromiseOps makeAs
 */
export function makeAs<E, A>(
  fiberId: LazyArg<FiberId>,
  __etsTrace?: string
): UIO<Promise<E, A>> {
  return Effect.succeed(Promise.unsafeMake(fiberId()))
}
