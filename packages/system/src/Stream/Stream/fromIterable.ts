import type { Stream } from "./definitions"
import { fromChunk } from "./fromChunk"

/**
 * Creates a stream from an iterable collection of values
 */
export function fromIterable<O>(as: Iterable<O>): Stream<unknown, never, O> {
  return fromChunk([...as])
}
