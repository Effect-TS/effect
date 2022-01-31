// ets_tracing: off

import * as CH from "../../Channel"
import * as C from "../core.js"

/**
 * Halt a stream with the specified error
 */
export function fail<E>(error: E): C.IO<E, never> {
  return new C.Stream(CH.fail(error))
}
