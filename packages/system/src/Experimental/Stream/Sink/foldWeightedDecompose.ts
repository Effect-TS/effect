// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Creates a sink that folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `S` aggregate to cross `max` into smaller elements.
 * Be vigilant with this function, it has to generate "simpler" values
 * or the fold may never end. A value is considered indivisible if
 * `decompose` yields the empty chunk or a single-valued chunk. In
 * these cases, there is no other choice than to yield a value that
 * will cross the threshold.
 *
 * The `foldWeightedDecomposeM` allows the decompose function
 * to return an `Effect` value, and consequently it allows the sink
 * to fail.
 */
export function foldWeightedDecompose<Err, In, S>(
  z: S,
  costFn: (s: S, in_: In) => number,
  max: number,
  decompose: (in_: In) => CK.Chunk<In>,
  f: (s: S, in_: In) => S
): C.Sink<unknown, Err, In, Err, In, S> {
  const go = (
    s: S,
    cost: number,
    dirty: boolean
  ): CH.Channel<unknown, Err, CK.Chunk<In>, unknown, Err, CK.Chunk<In>, S> =>
    CH.readWith(
      (in_) => {
        const fold = (
          in_: CK.Chunk<In>,
          s: S,
          dirty: boolean,
          cost: number,
          idx: number
        ): Tp.Tuple<[S, number, boolean, CK.Chunk<In>]> => {
          if (idx === CK.size(in_)) {
            return Tp.tuple(s, cost, dirty, CK.empty())
          } else {
            const elem = CK.unsafeGet_(in_, idx)
            const total = cost + costFn(s, elem)

            if (total <= max) {
              return fold(in_, f(s, elem), true, total, idx + 1)
            } else {
              const decomposed = decompose(elem)

              if (CK.size(decomposed) <= 1 && !dirty) {
                return Tp.tuple(f(s, elem), total, true, CK.drop_(in_, idx + 1))
              } else if (CK.size(in_) <= 1 && dirty) {
                return Tp.tuple(s, cost, dirty, CK.drop_(in_, idx))
              } else {
                return fold(
                  CK.concat_(decomposed, CK.drop_(in_, idx + 1)),
                  s,
                  dirty,
                  cost,
                  0
                )
              }
            }
          }
        }

        const {
          tuple: [nextS, nextCost, nextDirty, leftovers]
        } = fold(in_, s, dirty, cost, 0)

        if (!CK.isEmpty(leftovers)) {
          return CH.zipRight_(CH.write(leftovers), CH.end(nextS))
        } else if (cost > max) {
          return CH.end(nextS)
        } else {
          return go(nextS, nextCost, nextDirty)
        }
      },
      (err) => CH.fail(err),
      (_) => CH.end(s)
    )

  return new C.Sink(go(z, 0, false))
}
