// ets_tracing: off

import type * as T from "../../../../Effect"
import { identity } from "../../../../Function"
import type * as C from "../core"
import * as FromEffect from "./fromEffect"
import * as MapConcat from "./mapConcat"

/**
 * Creates a stream from an effect producing a value of type `Iterable[A]`
 */
export function fromIterableEffect<R, E, O>(
  iterable: T.Effect<R, E, Iterable<O>>
): C.Stream<R, E, O> {
  return MapConcat.mapConcat_(FromEffect.fromEffect(iterable), identity)
}
