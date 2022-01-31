import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../definition"

/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/EffectOps serviceWith
 */
export function serviceWith<T>(_: Tag<T>) {
  return <A>(f: (a: T) => A, __etsTrace?: string): Effect<Has<T>, never, A> =>
    Effect.serviceWithEffect(_)((a) => Effect.succeedNow(f(a)))
}
