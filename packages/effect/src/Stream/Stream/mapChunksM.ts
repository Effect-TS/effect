import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as A from "../../Array"
import { pipe } from "../../Function"
import * as O from "../../Option"
import { Stream } from "./definitions"

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export const mapChunksM = <O, S2, R2, E2, O2>(
  f: (_: A.Array<O>) => T.Effect<S2, R2, E2, A.Array<O2>>
) => <S, R, E>(self: Stream<S, R, E, O>): Stream<S2 | S, R & R2, E2 | E, O2> =>
  new Stream(
    pipe(
      self.proc,
      M.map((e) =>
        pipe(
          e,
          T.chain((x) => pipe(f(x), T.mapError<E2, O.Option<E | E2>>(O.some)))
        )
      )
    )
  )
