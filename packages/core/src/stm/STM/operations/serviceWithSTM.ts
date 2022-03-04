import type { Has, Tag } from "../../../data/Has"
import { STM } from "../definition"

/**
 * STMfully accesses the specified service in the environment of the
 * effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/STMOps serviceWithSTM
 */
export function serviceWithSTM<T>(tag: Tag<T>) {
  return <R, E, A>(f: (a: T) => STM<R, E, A>): STM<R & Has<T>, E, A> =>
    STM.service(tag).flatMap(f)
}
