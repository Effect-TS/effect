// ets_tracing: off

import * as T from "../../../../Effect"
import type * as Ex from "../../../../Exit"
import type * as C from "../core"
import * as FromEffect from "./fromEffect"

/**
 * The stream that ends with the `Exit` value `exit`.
 */
export function done<E, A>(exit: Ex.Exit<E, A>): C.IO<E, A> {
  return FromEffect.fromEffect(T.done(exit))
}
