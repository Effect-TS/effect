// ets_tracing: off

import type * as Ex from "../../Exit/index.js"
import * as T from "../_internal/effect.js"
import type { IO } from "./definitions.js"
import { fromEffect } from "./fromEffect.js"

/**
 * The stream that ends with the `Exit` value `exit`.
 */
export function done<E, A>(exit: Ex.Exit<E, A>): IO<E, A> {
  return fromEffect(T.done(exit))
}
