import * as Array_ from "../../Array"
import { pipe, Predicate } from "../../Function"
import type { Stream } from "./definitions"
import { mapChunks } from "./mapChunks"

/**
 * Applies the predicate to each element and allows passing elements 
 * to reach the output of this stream.
 */
export const filter = <O>(f: Predicate<O>) => <R, E>(
  self: Stream<R, E, O>
): Stream<R, E, O> =>
  pipe(
    self,
    mapChunks((o) => Array_.chain_(o, (o) => f(o) ? [o] : []))
  )
