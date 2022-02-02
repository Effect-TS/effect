// ets_tracing: off

import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * A sink that immediately ends with the specified value.
 */
export function succeed<Z>(z: Z): C.Sink<unknown, unknown, unknown, never, unknown, Z> {
  return new C.Sink(CH.succeed(z))
}
