// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import type { Predicate } from "../../../Function/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * A sink that folds its inputs with the provided function, termination predicate and initial state.
 */
export function fold<Err, In, S>(
  z: S,
  contFn: Predicate<S>,
  f: (s: S, in_: In) => S
): C.Sink<unknown, Err, In, Err, In, S> {
  const foldChunkSplit = (
    z: S,
    chunk: CK.Chunk<In>,
    contFn: Predicate<S>,
    f: (s: S, in_: In) => S
  ) => {
    const fold = (
      s: S,
      chunk: CK.Chunk<In>,
      idx: number,
      len: number
    ): Tp.Tuple<[S, CK.Chunk<In>]> => {
      if (idx === len) {
        return Tp.tuple(s, CK.empty<In>())
      } else {
        const s1 = f(s, CK.unsafeGet_(chunk, idx))

        if (contFn(s1)) {
          return fold(s1, chunk, idx + 1, len)
        } else {
          return Tp.tuple(s1, CK.drop_(chunk, idx + 1))
        }
      }
    }

    return fold(z, chunk, 0, CK.size(chunk))
  }

  const reader = (
    s: S
  ): CH.Channel<unknown, Err, CK.Chunk<In>, unknown, Err, CK.Chunk<In>, S> => {
    if (!contFn(s)) {
      return CH.end(s)
    }

    return CH.readWith(
      (in_) => {
        const {
          tuple: [nextS, leftovers]
        } = foldChunkSplit(s, in_, contFn, f)

        if (!CK.isEmpty(leftovers)) {
          return CH.as_(CH.write(leftovers), nextS)
        } else {
          return reader(nextS)
        }
      },
      (err) => CH.fail(err),
      (_) => CH.end(s)
    )
  }

  return new C.Sink(reader(z))
}
