// ets_tracing: off

import * as T from "../../../../Effect"
import type * as HS from "../../../../Has"
import type * as C from "../core"
import * as AccessServiceEffect from "./accessServiceEffect"

/**
 * Accesses the specified service in the environment of the effect.
 */
export function service<T extends HS.AnyService>(
  s: HS.Tag<T>
): C.Stream<HS.Has<T>, never, T> {
  return AccessServiceEffect.accessServiceEffect(s)(T.succeed)
}
