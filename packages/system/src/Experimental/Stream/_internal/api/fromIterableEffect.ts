// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import { identity } from "../../../../Function/index.js"
import type * as C from "../core.js"
import * as FromEffect from "./fromEffect.js"
import * as MapConcat from "./mapConcat.js"

/**
 * Creates a stream from an effect producing a value of type `Iterable[A]`
 */
export function fromIterableEffect<R, E, O>(
  iterable: T.Effect<R, E, Iterable<O>>
): C.Stream<R, E, O> {
  return MapConcat.mapConcat_(FromEffect.fromEffect(iterable), identity)
}
