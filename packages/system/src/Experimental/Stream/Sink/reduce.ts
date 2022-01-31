// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import type { Predicate } from "../../../Function/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * A sink that folds its inputs with the provided function, termination predicate and initial state.
 */
export function reduce<S, In, Err>(z: S, cont: Predicate<S>, f: (s: S, _in: In) => S) {
  const reduceChunkSplit =
    (z: S, chunk: CK.Chunk<In>) =>
    (cont: Predicate<S>) =>
    (f: (s: S, _in: In) => S) => {
      const reduce = (
        s: S,
        chunk: CK.Chunk<In>,
        idx: number,
        len: number
      ): Tp.Tuple<[S, CK.Chunk<In>]> => {
        if (idx === len) {
          return Tp.tuple(s, CK.empty<In>())
        } else {
          const s1 = f(s, CK.unsafeGet_(chunk, idx))

          if (cont(s1)) {
            return reduce(s1, chunk, idx + 1, len)
          } else {
            return Tp.tuple(s1, CK.drop_(chunk, idx + 1))
          }
        }
      }

      return reduce(z, chunk, 0, CK.size(chunk))
    }

  const reader = (
    s: S
  ): CH.Channel<unknown, Err, CK.Chunk<In>, unknown, Err, CK.Chunk<In>, S> => {
    if (!cont(s)) {
      return CH.end(s)
    } else {
      return CH.readWith(
        (_in) => {
          const {
            tuple: [nextS, leftovers]
          } = reduceChunkSplit(s, _in)(cont)(f)

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
  }

  return new C.Sink(reader(z))
}
