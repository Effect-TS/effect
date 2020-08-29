import * as Array_ from "../../Array"
import { pipe } from "../../Function"
import type { Stream } from "./definitions"
import { mapChunks } from "./mapChunks"

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export const mapConcat = <O, O2>(f: (_: O) => Iterable<O2>) => <S, R, E>(
  self: Stream<S, R, E, O>
): Stream<S, R, E, O2> =>
  pipe(
    self,
    mapChunks((o) => Array_.chain_(o, (o) => Array.from(f(o))))
  )
