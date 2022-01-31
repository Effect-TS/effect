// ets_tracing: off

import * as T from "../../../../Effect"
import type * as Ex from "../../../../Exit"
import type * as C from "../core.js"
import * as FromEffect from "./fromEffect.js"

/**
 * The stream that ends with the `Exit` value `exit`.
 */
export function done<E, A>(exit: Ex.Exit<E, A>): C.IO<E, A> {
  return FromEffect.fromEffect(T.done(exit))
}
