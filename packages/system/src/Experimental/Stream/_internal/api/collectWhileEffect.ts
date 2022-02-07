// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as LoopOnPartialChunks from "./loopOnPartialChunks.js"

/**
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhileEffect_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  pf: (a: A) => O.Option<T.Effect<R1, E1, A1>>
): C.Stream<R & R1, E | E1, A1> {
  return LoopOnPartialChunks.loopOnPartialChunks_(self, (chunk, emit) => {
    const pfSome = (a: A) =>
      O.fold_(
        pf(a),
        () => T.succeed(false),
        (_) => T.as_(T.chain_(_, emit), true)
      )

    const loop = (chunk: CK.Chunk<A>): T.Effect<R1, E1, boolean> => {
      if (CK.isEmpty(chunk)) {
        return T.succeed(true)
      } else {
        return T.chain_(pfSome(CK.unsafeHead(chunk)), (cont) => {
          if (cont) {
            return loop(CK.unsafeTail(chunk))
          } else {
            return T.succeed(false)
          }
        })
      }
    }

    return loop(chunk)
  })
}

/**
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 *
 * @ets_data_first collectWhileEffect_
 */
export function collectWhileEffect<R1, E1, A, A1>(
  pf: (a: A) => O.Option<T.Effect<R1, E1, A1>>
) {
  return <R, E>(self: C.Stream<R, E, A>) => collectWhileEffect_(self, pf)
}
