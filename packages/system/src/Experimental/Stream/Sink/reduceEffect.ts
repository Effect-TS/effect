// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../Effect/index.js"
import type { Predicate } from "../../../Function/index.js"
import { pipe } from "../../../Function/index.js"
import * as O from "../../../Option/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * A sink that effectfully folds its inputs with the provided function, termination predicate and initial state.
 */
export function reduceEffect<S, Env, In, InErr, OutErr>(
  z: S,
  cont: Predicate<S>,
  f: (s: S, _in: In) => T.Effect<Env, OutErr, S>
): C.Sink<Env, InErr, In, InErr | OutErr, In, S> {
  const reduceChunkSplit =
    (z: S, chunk: CK.Chunk<In>) =>
    (cont: Predicate<S>) =>
    (f: (s: S, _in: In) => T.Effect<Env, OutErr, S>) => {
      const reduce = (
        s: S,
        chunk: CK.Chunk<In>,
        idx: number,
        len: number
      ): T.Effect<Env, OutErr, Tp.Tuple<[S, O.Option<CK.Chunk<In>>]>> => {
        if (idx === len) {
          return T.succeed(Tp.tuple(s, O.none))
        } else {
          return T.chain_(f(s, CK.unsafeGet_(chunk, idx)), (s1) => {
            if (cont(s1)) {
              return reduce(s1, chunk, idx + 1, len)
            } else {
              return T.succeed(Tp.tuple(s1, O.some(CK.drop_(chunk, idx + 1))))
            }
          })
        }
      }

      return reduce(z, chunk, 0, CK.size(chunk))
    }

  const reader = (
    s: S
  ): CH.Channel<Env, InErr, CK.Chunk<In>, unknown, InErr | OutErr, CK.Chunk<In>, S> => {
    if (!cont(s)) {
      return CH.end(s)
    } else {
      return CH.readWith(
        (_in) => {
          return pipe(
            CH.fromEffect(reduceChunkSplit(s, _in)(cont)(f)),
            CH.chain(({ tuple: [nextS, leftovers] }) => {
              return O.fold_(
                leftovers,
                () => reader(nextS),
                (l) => CH.as_(CH.write(l), nextS)
              )
            })
          )
        },
        (err) => CH.fail(err),
        (_) => CH.end(s)
      )
    }
  }

  return new C.Sink(reader(z))
}
