// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import type * as T from "../../../../Effect"
import * as SK from "../../Sink"
import type * as C from "../core"
import * as Run from "./run"

/**
 * Runs the stream and collects all of its elements to a chunk.
 */
export function runCollect<R, E, A>(
  self: C.Stream<R, E, A>
): T.Effect<R, E, CK.Chunk<A>> {
  return Run.run_(self, SK.collectAll())
}
