// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as CH from "../../Channel/index.js"
import type * as C from "../core.js"
import * as LoopOnChunks from "./loopOnChunks.js"

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
        const outputChunk = CK.builder<A1>()
        const emit = (a: A1) =>
          T.succeedWith(() => {
            outputChunk.append(a)
          })

        return T.catchAll_(
          T.map_(f(chunk, emit), (cont) =>
            CH.chain_(CH.write(outputChunk.build()), () => CH.end(cont))
          ),
          (failure) =>
            T.succeedWith(() => {
              const partialResult = outputChunk.build()

              if (CK.isEmpty(partialResult)) {
                return CH.fail(failure)
              } else {
                return CH.zipRight_(CH.write(partialResult), CH.fail(failure))
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
