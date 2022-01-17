import { currentEnvironment } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import type { Has, Tag } from "../../Has"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Effectfully accesses the specified service in the environment of the
 * effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 */
export function serviceWithEffect<T>(_: Tag<T>) {
  return <R, E, A>(
    f: (a: T) => Effect<R, E, A>,
    __trace?: string
  ): Effect<R & Has<T>, E, A> =>
    suspendSucceed(() =>
      chain_(
        fiberRefGet(currentEnvironment.value),
        (environment: Has<T>) => f(environment[_.key]),
        __trace
      )
    )
}
