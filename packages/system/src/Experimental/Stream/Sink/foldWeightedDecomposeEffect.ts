// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../Effect/index.js"
import { pipe } from "../../../Function/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Creates a sink that effectfully folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`) have
 * been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `S` aggregate to cross `max` into smaller elements. Be vigilant with
 * this function, it has to generate "simpler" values or the fold may never end.
 * A value is considered indivisible if `decompose` yields the empty chunk or a
 * single-valued chunk. In these cases, there is no other choice than to yield
 * a value that will cross the threshold.
 *
 * See `foldWeightedDecompose` for an example.
 */
export function foldWeightedDecomposeEffect<Env, Env1, Env2, Err, Err1, Err2, In, S>(
  z: S,
  costFn: (s: S, in_: In) => T.Effect<Env, Err, number>,
  max: number,
  decompose: (in_: In) => T.Effect<Env1, Err1, CK.Chunk<In>>,
  f: (s: S, in_: In) => T.Effect<Env2, Err2, S>
): C.Sink<Env & Env1 & Env2, Err, In, Err | Err1 | Err2, In, S> {
  const go = (
    s: S,
    cost: number,
    dirty: boolean
  ): CH.Channel<
    Env & Env1 & Env2,
    Err,
    CK.Chunk<In>,
    unknown,
    Err | Err1 | Err2,
    CK.Chunk<In>,
    S
  > =>
    CH.readWith(
      (in_) => {
        const fold = (
          in_: CK.Chunk<In>,
          s: S,
          dirty: boolean,
          cost: number,
          idx: number
        ): T.Effect<
          Env & Env1 & Env2,
          Err | Err1 | Err2,
          Tp.Tuple<[S, number, boolean, CK.Chunk<In>]>
        > => {
          if (idx === CK.size(in_)) {
            return T.succeed(Tp.tuple(s, cost, dirty, CK.empty()))
          } else {
            const elem = CK.unsafeGet_(in_, idx)

            return pipe(
              costFn(s, elem),
              T.map((_) => cost + _),
              T.chain((total) => {
                if (total <= max) {
                  return T.chain_(f(s, elem), (_) => fold(in_, _, true, total, idx + 1))
                } else {
                  return T.chain_(decompose(elem), (decomposed) => {
                    if (CK.size(decomposed) <= 1 && !dirty) {
                      return T.map_(f(s, elem), (_) =>
                        Tp.tuple(_, total, true, CK.drop_(in_, idx + 1))
                      )
                    } else if (CK.size(decomposed) <= 1 && dirty) {
                      return T.succeed(Tp.tuple(s, cost, dirty, CK.drop_(in_, idx)))
                    } else {
                      return fold(
                        CK.concat_(decomposed, CK.drop_(in_, idx + 1)),
                        s,
                        dirty,
                        cost,
                        0
                      )
                    }
                  })
                }
              })
            )
          }
        }

        return pipe(
          CH.fromEffect(fold(in_, s, dirty, cost, 0)),
          CH.chain(({ tuple: [nextS, nextCost, nextDirty, leftovers] }) => {
            if (!CK.isEmpty(leftovers)) {
              return CH.zipRight_(CH.write(leftovers), CH.end(nextS))
            } else if (cost > max) {
              return CH.end(nextS)
            } else {
              return go(nextS, nextCost, nextDirty)
            }
          })
        )
      },
      (err) => CH.fail(err),
      (_) => CH.end(s)
    )

  return new C.Sink(go(z, 0, false))
}
