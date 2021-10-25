// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as T from "../../../../Effect"
import * as CH from "../../Channel"
import type * as C from "../core"
import * as LoopOnChunks from "./loopOnChunks"

/**
 * Loops on chunks emitting partially
 */
export function loopOnPartialChunks_<R, E, A, R1, E1, A1>(
  self: C.Stream<R, E, A>,
  f: (a: CK.Chunk<A>, emit: (a: A1) => T.UIO<void>) => T.Effect<R1, E1, boolean>
): C.Stream<R & R1, E | E1, A1> {
  return LoopOnChunks.loopOnChunks_(self, (chunk) =>
    CH.unwrap(
      T.suspend(() => {
        let outputChunk = CK.empty<A1>()
        return T.catchAll_(
          T.map_(
            f(chunk, (a: A1) =>
              T.succeedWith(() => {
                outputChunk = CK.append_(outputChunk, a)
              })
            ),
            (cont) => CH.chain_(CH.write(outputChunk), () => CH.end(cont))
          ),
          (failure) =>
            T.succeedWith(() => {
              if (CK.isEmpty(outputChunk)) {
                return CH.fail(failure)
              } else {
                return CH.chain_(CH.write(outputChunk), () => CH.fail(failure))
              }
            })
        )
      })
    )
  )
}

/**
 * Loops on chunks emitting partially
 *
 * @ets_data_first loopOnPartialChunks_
 */
export function loopOnPartialChunks<A, R1, E1, A1>(
  f: (a: CK.Chunk<A>, emit: (a: A1) => T.UIO<void>) => T.Effect<R1, E1, boolean>
) {
  return <R, E>(self: C.Stream<R, E, A>) => loopOnPartialChunks_(self, f)
}
