// ets_tracing: off

import type * as HS from "../../../../Has/index.js"
import type * as C from "../core.js"
import * as Chain from "./chain.js"
import * as Service from "./service.js"

/**
 * Accesses the specified service in the environment of the stream in the
 * context of a stream.
 */
export function serviceWithStream<T>(s: HS.Tag<T>) {
  return <R, E, A>(f: (t: T) => C.Stream<R, E, A>) =>
    Chain.chain_(Service.service(s), f)
}
