import type { Has, Tag } from "../../../data/Has"
import { Managed } from "../definition"

/**
 * Effectfully accesses the specified managed service in the environment of
 * the effect .
 *
 * Especially useful for creating "accessor" methods on services' which access
 * managed resources.
 *
 * @ets static ets/ManagedOps serviceWithManaged
 */
export function serviceWithManaged<T>(_: Tag<T>) {
  return <R, E, A>(
    f: (service: T) => Managed<R, E, A>,
    __etsTrace?: string
  ): Managed<R & Has<T>, E, A> =>
    Managed.environmentWithManaged((r: Has<T>) => f(r[_.key]))
}
