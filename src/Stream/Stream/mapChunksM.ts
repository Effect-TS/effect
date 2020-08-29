import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as Array from "../../Array"
import { pipe } from "../../Function"
import * as Option from "../../Option"
import { Stream } from "./definitions"

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export const mapChunksM = <O, S2, R2, E2, O2>(
  f: (_: Array.Array<O>) => T.Effect<S2, R2, E2, Array.Array<O2>>
) => <S, R, E>(self: Stream<S, R, E, O>): Stream<S2 | S, R & R2, E2 | E, O2> =>
  new Stream(
    pipe(
      self.proc,
      M.map((e) =>
        pipe(
          e,
          T.chain((x) => pipe(f(x), T.mapError<E2, Option.Option<E | E2>>(Option.some)))
        )
      )
    )
  )
