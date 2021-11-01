// ets_tracing: off

import * as T from "../../../../Effect"
import type * as HS from "../../../../Has"
import * as FromEffect from "./fromEffect"

/**
 * Accesses the specified service in the environment of the stream in the
 * context of an effect.
 */
export function serviceWith<T extends HS.AnyService>(s: HS.Tag<T>) {
  return <R, E, A>(f: (t: T) => T.Effect<R, E, A>) =>
    FromEffect.fromEffect(T.accessServiceM(s)(f))
}
