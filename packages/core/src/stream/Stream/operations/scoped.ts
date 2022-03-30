import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Creates a single-valued stream from a scoped resource.
 *
 * @tsplus static ets/StreamOps scoped
 */
export function scoped<R, E, A>(
  effect: LazyArg<Effect<R & HasScope, E, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return new StreamInternal(Channel.scopedOut(effect().map(Chunk.single)))
}
