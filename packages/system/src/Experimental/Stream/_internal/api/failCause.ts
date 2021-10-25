// ets_tracing: off

import type * as CS from "../../../../Cause"
import * as T from "../../../../Effect"
import type * as C from "../core"
import * as FromEffect from "./fromEffect"

/**
 * The stream that always fails with `cause`.
 */
export function failCause<E>(cause: CS.Cause<E>): C.IO<E, never> {
  return FromEffect.fromEffect(T.halt(cause))
}
