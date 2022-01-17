import type { Has, Tag } from "../../Has"
import type { Managed } from "../definition"
import { environmentWithManaged } from "./environmentWithManaged"

/**
 * Effectfully accesses the specified managed service in the environment of
 * the effect .
 *
 * Especially useful for creating "accessor" methods on services' which access
 * managed resources.
 */
export function serviceWithManaged<T>(_: Tag<T>) {
  return <R, E, A>(
    f: (service: T) => Managed<R, E, A>,
    __trace?: string
  ): Managed<R & Has<T>, E, A> =>
    environmentWithManaged((r: Has<T>) => f(r[_.key]), __trace)
}
