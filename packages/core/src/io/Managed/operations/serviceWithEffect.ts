import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../../Effect/definition"
import { Managed } from "../definition"

/**
 * Effectfully accesses the specified service in the environment of the
 * effect.
 *
 * @tsplus static ets/ManagedOps serviceWithEffect
 */
export function serviceWithEffect<T>(_: Tag<T>) {
  return <R, E, A>(
    f: (service: T) => Effect<R, E, A>,
    __tsplusTrace?: string
  ): Managed<R & Has<T>, E, A> => Managed.fromEffect(Effect.serviceWithEffect(_)(f))
}
