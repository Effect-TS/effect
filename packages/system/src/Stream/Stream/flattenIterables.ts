import type { Stream } from "./definitions"
import { flattenChunks } from "./flattenChunks"
import { map_ } from "./map"

/**
 * Submerges the iterables carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenIterables<R, E, O1>(
  self: Stream<R, E, Iterable<O1>>
): Stream<R, E, O1> {
  return flattenChunks(map_(self, (o) => [...o]))
}
