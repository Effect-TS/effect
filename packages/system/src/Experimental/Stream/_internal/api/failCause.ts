// ets_tracing: off

import type * as CS from "../../../../Cause/index.js"
import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as FromEffect from "./fromEffect.js"

/**
 * The stream that always fails with `cause`.
 */
export function failCause<E>(cause: CS.Cause<E>): C.IO<E, never> {
  return FromEffect.fromEffect(T.halt(cause))
}
