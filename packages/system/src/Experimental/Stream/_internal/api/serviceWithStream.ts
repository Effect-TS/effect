// ets_tracing: off

import type * as HS from "../../../../Has"
import type * as C from "../core"
import * as Chain from "./chain"
import * as Service from "./service"

/**
 * Accesses the specified service in the environment of the stream in the
 * context of a stream.
 */
export function serviceWithStream<T extends HS.AnyService>(s: HS.Tag<T>) {
  return <R, E, A>(f: (t: T) => C.Stream<R, E, A>) =>
    Chain.chain_(Service.service(s), f)
}
