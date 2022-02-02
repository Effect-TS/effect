// ets_tracing: off

import type * as C from "../core.js"
import * as Chain from "./chain.js"
import * as Environment from "./environment.js"

/**
 * Accesses the environment of the stream in the context of a stream.
 */
export function accessStream<R, R1, E, A>(
  f: (r: R) => C.Stream<R1, E, A>
): C.Stream<R & R1, E, A> {
  return Chain.chain_(Environment.environment<R>(), f)
}
