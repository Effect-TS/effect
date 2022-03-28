import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Managed } from "../../../io/Managed"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Creates a single-valued stream from a managed resource.
 *
 * @tsplus static ets/StreamOps managed
 */
export function managed<R, E, A>(
  managed: LazyArg<Managed<R, E, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return new StreamInternal(Channel.managedOut(managed().map(Chunk.single)))
}
