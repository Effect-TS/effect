// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as HS from "../../../../Has/index.js"
import * as FromEffect from "./fromEffect.js"

/**
 * Accesses the specified service in the environment of the stream in the
 * context of an effect.
 */
export function serviceWith<T>(s: HS.Tag<T>) {
  return <R, E, A>(f: (t: T) => T.Effect<R, E, A>) =>
    FromEffect.fromEffect(T.accessServiceM(s)(f))
}
