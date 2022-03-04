import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"
import type { TExit } from "../TExit"

/**
 * Returns a value modelled on provided exit status.
 *
 * @tsplus static ets/STMOps done
 */
export function done<E, A>(exit: LazyArg<TExit<E, A>>): STM<unknown, E, A> {
  return STM.suspend(done(exit))
}
