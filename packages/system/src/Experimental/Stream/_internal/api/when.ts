// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as WhenEffect from "./whenEffect.js"

/**
 * Returns this stream if the specified condition is satisfied, otherwise returns an empty stream.
 */
export function when_<R, E, A>(
  stream: C.Stream<R, E, A>,
  b: () => boolean
): C.Stream<R, E, A> {
  return WhenEffect.whenEffect_(stream, T.succeed(b()))
}

/**
 * Returns this stream if the specified condition is satisfied, otherwise returns an empty stream.
 *
 * @ets_data_first when_
 */
export function when(b: () => boolean) {
  return <R, E, A>(stream: C.Stream<R, E, A>) => when_(stream, b)
}
