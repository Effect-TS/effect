// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../../../Function/index.js"
import * as O from "../../../../Option/index.js"
import { RingBufferNew } from "../../../../Support/RingBufferNew/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"
import * as Chain from "./chain.js"
import * as Die from "./die.js"
import * as SucceedWith from "./succeedWith.js"

/**
 * Emits a sliding window of n elements.
 */
export function sliding_<R, E, A>(
  self: C.Stream<R, E, A>,
  chunkSize: number,
  stepSize = 1
): C.Stream<R, E, CK.Chunk<A>> {
  if (chunkSize <= 0 || stepSize <= 0) {
    return Die.die(
      new CS.IllegalArgumentException(
        "invalid bounds. `chunkSize` and `stepSize` must be greater than zero"
      )
    )
  }

  return pipe(
    SucceedWith.succeedWith(() => new RingBufferNew<A>(chunkSize)),
    Chain.chain((queue) => {
      const emitOnStreamEnd = (
        queueSize: number,
        channelEnd: CH.Channel<
          unknown,
          E,
          CK.Chunk<A>,
          unknown,
          E,
          CK.Chunk<CK.Chunk<A>>,
          any
        >
      ) => {
        if (queueSize < chunkSize) {
          const items = queue.toChunk()
          const result = CK.isEmpty(items) ? CK.empty<CK.Chunk<A>>() : CK.single(items)

          return CH.zipRight_(CH.write(result), channelEnd)
        } else {
          const lastEmitIndex = queueSize - ((queueSize - chunkSize) % stepSize)

          if (lastEmitIndex === queueSize) {
            return channelEnd
          } else {
            const leftovers = queueSize - (lastEmitIndex - chunkSize + stepSize)
            const lastItems = CK.takeRight_(queue.toChunk(), leftovers)
            const result = CK.isEmpty(lastItems)
              ? CK.empty<CK.Chunk<A>>()
              : CK.single(lastItems)

            return CH.zipRight_(CH.write(result), channelEnd)
          }
        }
      }

      const reader = (
        queueSize: number
      ): CH.Channel<unknown, E, CK.Chunk<A>, unknown, E, CK.Chunk<CK.Chunk<A>>, any> =>
        CH.readWithCause(
          (in_) =>
            CH.zipRight_(
              CH.write(
                pipe(
                  in_,
                  CK.zipWithIndex,
                  CK.collect(({ tuple: [i, idx] }) => {
                    queue.put(i)

                    const currentIndex = queueSize + idx + 1

                    if (
                      currentIndex < chunkSize ||
                      (currentIndex - chunkSize) % stepSize > 0
                    ) {
                      return O.none
                    } else {
                      return O.some(queue.toChunk())
                    }
                  })
                )
              ),
              reader(queueSize + CK.size(in_))
            ),
          (cause) => emitOnStreamEnd(queueSize, CH.failCause(cause)),
          (_) => emitOnStreamEnd(queueSize, CH.unit)
        )

      return new C.Stream(self.channel[">>>"](reader(0)))
    })
  )
}

/**
 * Emits a sliding window of n elements.
 *
 * @ets_data_first sliding_
 */
export function sliding(chunkSize: number, stepSize = 1) {
  return <R, E, A>(self: C.Stream<R, E, A>) => sliding_(self, chunkSize, stepSize)
}
