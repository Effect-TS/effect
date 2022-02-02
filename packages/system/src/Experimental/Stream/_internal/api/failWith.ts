// ets_tracing: off

import * as CH from "../../Channel"
import * as C from "../core"

/**
 * Halt a stream with the specified error
 */
export function failWith<E>(error: () => E): C.IO<E, never> {
  return new C.Stream(CH.failWith(error))
}
