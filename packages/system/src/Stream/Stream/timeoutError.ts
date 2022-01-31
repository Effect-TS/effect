// ets_tracing: off

import * as C from "../../Cause/index.js"
import { timeoutErrorCause } from "./timeoutErrorCause.js"

/**
 * Fails the stream with given error if it does not produce a value after d duration.
 */
export function timeoutError<E1>(e: () => E1) {
  return (d: number) => timeoutErrorCause(C.fail(e()))(d)
}
