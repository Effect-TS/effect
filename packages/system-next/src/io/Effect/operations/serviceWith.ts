import type { Has, Tag } from "../../../data/Has"
import type { Effect } from "../definition"
import { serviceWithEffect } from "./serviceWithEffect"
import { succeedNow } from "./succeedNow"

/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @ets static ets/EffectOps serviceWith
 */
export function serviceWith<T>(_: Tag<T>) {
  return <A>(f: (a: T) => A, __etsTrace?: string): Effect<Has<T>, never, A> =>
    serviceWithEffect(_)((a) => succeedNow(f(a)), __etsTrace)
}
