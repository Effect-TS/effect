// ets_tracing: off

import * as CH from "../Channel"
import * as C from "./core"

/**
 * Returns a sink that executes a total effect and ends with its result.
 */
export function succeedWith<A>(
  effect: () => A
): C.Sink<unknown, unknown, unknown, never, unknown, A> {
  return new C.Sink(CH.succeedWith(effect))
}
