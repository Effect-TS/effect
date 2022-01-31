// ets_tracing: off

import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * A sink that always fails with the specified error.
 */
export function fail<E>(e: E): C.Sink<unknown, unknown, unknown, E, never, never> {
  return new C.Sink(CH.fail(e))
}
