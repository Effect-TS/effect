import * as C from "../Cause/cause"
import { haltWith } from "./core"

/**
 * Returns an effect that models failure with the specified error.
 * The moral equivalent of `throw` for pure code.
 *
 * @trace
 */
export function fail<E>(e: E) {
  return haltWith((trace) => C.traced(C.fail(e), trace()))
}
