import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Accesses the specified service in the environment of the effect.
 *
 * @tsplus static ets/ManagedOps serviceWith
 */
export function serviceWith<T>(_: Tag<T>) {
  return <A>(f: (service: T) => A, __tsplusTrace?: string): Managed<Has<T>, never, A> =>
    Managed.fromEffect(Effect.serviceWith(_)(f))
}
