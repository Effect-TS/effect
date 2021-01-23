import type * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { Stream } from "./definitions"

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksM_<R, E, E2, O, O2, R2>(
  self: Stream<R, E, O>,
  f: (_: A.Chunk<O>) => T.Effect<R2, E2, A.Chunk<O2>>
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
  f: (_: A.Chunk<O>) => T.Effect<R2, E2, A.Chunk<O2>>
) {
  return <R, E>(self: Stream<R, E, O>) => mapChunksM_(self, f)
}
