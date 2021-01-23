import { identity } from "../../Function"
import type * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { fromEffect } from "./fromEffect"
import { mapConcat_ } from "./mapConcat"

/**
 * Creates a stream from an iterable collection of values
 */
export function fromIterableM<R, E, O>(
  iterable: T.Effect<R, E, Iterable<O>>
): Stream<R, E, O> {
  return mapConcat_(fromEffect(iterable), identity)
}
