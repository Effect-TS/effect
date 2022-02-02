// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as RB from "../../../../Support/RingBufferNew/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"
import * as Chain from "./chain.js"
import * as SucceedWith from "./succeedWith.js"

/**
 * Drops the last specified number of elements from this stream.
 *
 * @note This combinator keeps `n` elements in memory. Be careful with big numbers.
 */
export function dropRight_<R, E, A>(
  self: C.Stream<R, E, A>,
  n: number
): C.Stream<R, E, A> {
  if (n <= 0) {
    return new C.Stream(self.channel)
  }

  return Chain.chain_(
    SucceedWith.succeedWith(() => new RB.RingBufferNew<A>(n)),
    (queue) => {
      const reader: CH.Channel<
        unknown,
        E,
        CK.Chunk<A>,
        unknown,
        E,
        CK.Chunk<A>,
        void
      > = CH.readWith(
        (in_) => {
          const outs = CK.collect_(in_, (elem) => {
            const head = queue.head()

            queue.put(elem)

            return head
          })

          return CH.zipRight_(CH.write(outs), reader)
        },
        (_) => CH.fail(_),
        (_) => CH.unit
      )

      return new C.Stream(self.channel[">>>"](reader))
    }
  )
}

/**
 * Drops the last specified number of elements from this stream.
 *
 * @note This combinator keeps `n` elements in memory. Be careful with big numbers.
 *
 * @ets_data_first dropRight_
 */
export function dropRight(n: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => dropRight_(self, n)
}
