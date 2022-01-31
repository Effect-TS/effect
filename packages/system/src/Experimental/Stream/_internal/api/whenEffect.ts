// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as Chain from "./chain.js"
import * as Empty from "./empty.js"
import * as FromEffect from "./fromEffect.js"

/**
 * Returns this stream if the specified condition is satisfied, otherwise returns an empty stream.
 */
export function whenEffect_<R, R1, E, E1, A>(
  self: C.Stream<R, E, A>,
  b: T.Effect<R1, E1, boolean>
): C.Stream<R1 & R, E | E1, A> {
  return Chain.chain_(FromEffect.fromEffect(b), (_) => (_ ? self : Empty.empty))
}

/**
 * Returns this stream if the specified condition is satisfied, otherwise returns an empty stream.
 *
 * @ets_data_first whenEffect_
 */
export function whenEffect<R1, E1>(b: T.Effect<R1, E1, boolean>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => whenEffect_(self, b)
}
