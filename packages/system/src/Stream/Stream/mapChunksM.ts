// ets_tracing: off

import type * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksM_<R, E, E2, O, O2, R2>(
  self: Stream<R, E, O>,
  f: (_: Chunk.Chunk<O>) => T.Effect<R2, E2, Chunk.Chunk<O2>>
): Stream<R & R2, E2 | E, O2> {
  return new Stream(
    M.map_(self.proc, (e) =>
      T.chain_(e, (x) => pipe(f(x), T.mapError<E2, O.Option<E | E2>>(O.some)))
    )
  )
}

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksM<E2, O, O2, R2>(
  f: (_: Chunk.Chunk<O>) => T.Effect<R2, E2, Chunk.Chunk<O2>>
) {
  return <R, E>(self: Stream<R, E, O>) => mapChunksM_(self, f)
}
