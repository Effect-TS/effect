import * as T from "../_internal/effect"
import { pipe } from "../../Function"
import type { Stream } from "./definitions"
import { mapConcatChunkM } from "./mapConcatChunkM"

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export const mapConcatM = <R2, E2, O, O2>(
  f: (_: O) => T.Effect<R2, E2, Iterable<O2>>
) => <R, E>(self: Stream<R, E, O>): Stream<R & R2, E2 | E, O2> =>
  pipe(
    self,
    mapConcatChunkM((o) =>
      pipe(
        f(o),
        T.map((o) => Array.from(o))
      )
    )
  )
