import { Chunk } from "../../../collection/immutable/Chunk"
import { constTrue } from "../../../data/Function"
import type { Sink } from "../definition"

/**
 * Repeatedly runs the provided sink.
 *
 * @tsplus fluent ets/Sink repeat
 */
export function repeat<R, E, In, L extends In, Z>(
  self: Sink<R, E, In, L, Z>,
  __tsplusTrace?: string
): Sink<R, E, In, L, Chunk<Z>> {
  return self.collectAllWhileWith(Chunk.empty<Z>(), constTrue, (s, z) => s.append(z))
}
