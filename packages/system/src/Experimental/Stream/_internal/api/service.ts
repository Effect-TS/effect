// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as HS from "../../../../Has/index.js"
import type * as C from "../core.js"
import * as AccessServiceEffect from "./accessServiceEffect.js"

/**
 * Accesses the specified service in the environment of the effect.
 */
export function service<T>(s: HS.Tag<T>): C.Stream<HS.Has<T>, never, T> {
  return AccessServiceEffect.accessServiceEffect(s)(T.succeed)
}
