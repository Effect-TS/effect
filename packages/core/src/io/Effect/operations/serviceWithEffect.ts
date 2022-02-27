import type { Has, Tag } from "../../../data/Has"
import { FiberRef } from "../../FiberRef"
import { Effect } from "../definition"

/**
 * Effectfully accesses the specified service in the environment of the
 * effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/EffectOps serviceWithEffect
 */
export function serviceWithEffect<T>(tag: Tag<T>) {
  return <R, E, A>(
    f: (a: T) => Effect<R, E, A>,
    __tsplusTrace?: string
  ): Effect<R & Has<T>, E, A> =>
    Effect.suspendSucceed(
      FiberRef.currentEnvironment.value
        .get()
        .flatMap((environment: Has<T>) => f(environment[tag.key]))
    )
}
