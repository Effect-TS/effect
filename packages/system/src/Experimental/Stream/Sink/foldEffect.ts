// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../Effect/index.js"
import type { Predicate } from "../../../Function/index.js"
import * as O from "../../../Option/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * A sink that effectfully folds its inputs with the provided function, termination predicate and initial state.
 */
export function foldEffect<Env, Err, In, S>(
  z: S,
  contFn: (s: S) => boolean,
  f: (s: S, in_: In) => T.Effect<Env, Err, S>
): C.Sink<Env, Err, In, Err, In, S> {
  const foldChunkSplitM = (
    z: S,
    chunk: CK.Chunk<In>,
    contFn: Predicate<S>,
    f: (s: S, in_: In) => T.Effect<Env, Err, S>
  ) => {
    const fold = (
      s: S,
      chunk: CK.Chunk<In>,
      idx: number,
      len: number
    ): T.Effect<Env, Err, Tp.Tuple<[S, O.Option<CK.Chunk<In>>]>> => {
      if (idx === len) {
        return T.succeed(Tp.tuple(s, O.none))
      } else {
        return T.chain_(f(s, CK.unsafeGet_(chunk, idx)), (s1) => {
          if (contFn(s1)) {
            return fold(s1, chunk, idx + 1, len)
          } else {
            return T.succeed(Tp.tuple(s1, O.some(CK.drop_(chunk, idx + 1))))
          }
        })
      }
    }

    return fold(z, chunk, 0, CK.size(chunk))
  }

  const reader = (
    s: S
  ): CH.Channel<Env, Err, CK.Chunk<In>, unknown, Err, CK.Chunk<In>, S> =>
    CH.readWith(
      (in_: CK.Chunk<In>) =>
        CH.chain_(
          CH.fromEffect(foldChunkSplitM(s, in_, contFn, f)),
          ({ tuple: [nextS, leftovers] }) =>
            O.fold_(
              leftovers,
              () => reader(nextS),
              (l) => CH.as_(CH.write(l), nextS)
            )
        ),
      (err: Err) => CH.fail(err),
      (_) => CH.end(s)
    )

  return new C.Sink(contFn(z) ? reader(z) : CH.end(z))
}
