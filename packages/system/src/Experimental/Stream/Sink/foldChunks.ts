// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import type { Predicate } from "../../../Function/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * A sink that folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export function foldChunks<Err, In, S>(
  z: S,
  contFn: Predicate<S>,
  f: (s: S, chunk: CK.Chunk<In>) => S
): C.Sink<unknown, Err, In, Err, unknown, S> {
  const reader = (
    s: S
  ): CH.Channel<unknown, Err, CK.Chunk<In>, unknown, Err, never, S> =>
    CH.readWith(
      (in_) => {
        const nextS = f(s, in_)

        return contFn(nextS) ? reader(nextS) : CH.end(nextS)
      },
      (err) => CH.fail(err),
      (_) => CH.end(s)
    )

  return new C.Sink(contFn(z) ? reader(z) : CH.end(z))
}
