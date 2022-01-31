// ets_tracing: off

import { identity } from "../../Function/index.js"
import type * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { fromEffect } from "./fromEffect.js"
import { mapConcat_ } from "./mapConcat.js"

/**
 * Creates a stream from an iterable collection of values
 */
export function fromIterableM<R, E, O>(
  iterable: T.Effect<R, E, Iterable<O>>
): Stream<R, E, O> {
  return mapConcat_(fromEffect(iterable), identity)
}
