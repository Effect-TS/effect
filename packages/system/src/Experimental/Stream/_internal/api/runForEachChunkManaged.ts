// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as T from "../../../../Effect/index.js"
import type * as M from "../../../../Managed/index.js"
import * as SK from "../../Sink/index.js"
import type * as C from "../core.js"
import * as RunManaged from "./runManaged.js"

/**
 * Like `Stream#forEachChunk`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function runForEachChunkManaged_<R, R1, E, E1, A, Z>(
  self: C.Stream<R, E, A>,
  f: (c: CK.Chunk<A>) => T.Effect<R1, E1, Z>
): M.Managed<R & R1, E | E1, void> {
  return RunManaged.runManaged_(self, SK.forEachChunk(f))
}

/**
 * Like `Stream#forEachChunk`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function runForEachChunkManaged<R1, E1, A, Z>(
  f: (c: CK.Chunk<A>) => T.Effect<R1, E1, Z>
) {
  return <R, E>(self: C.Stream<R, E, A>) => runForEachChunkManaged_(self, f)
}
