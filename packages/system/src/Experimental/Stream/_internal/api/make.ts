// ets_tracing: off

import type * as C from "../core"
import * as FromIterable from "./fromIterable"

/**
 * Creates a stream from the specified values
 */
export function make<A>(...values: A[]): C.UIO<A> {
  return FromIterable.fromIterable(values)
}
