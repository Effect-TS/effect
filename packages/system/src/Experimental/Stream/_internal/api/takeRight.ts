// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as RB from "../../../../Support/RingBufferNew/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"
import * as Empty from "./empty.js"

/**
 * Takes the last specified number of elements from this stream.
 */
export function takeRight_<R, E, A>(
  self: C.Stream<R, E, A>,
  n: number
): C.Stream<R, E, A> {
  if (n <= 0) {
    return Empty.empty
  }

  return new C.Stream(
    CH.unwrap(
      pipe(
        T.do,
        T.bind("queue", () => T.succeedWith(() => new RB.RingBufferNew<A>(n))),
        T.map(({ queue }) => {
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
              CK.forEach_(in_, (_) => queue.put(_))

              return reader
            },
            (_) => CH.fail(_),
            (_) => CH.zipRight_(CH.write(queue.toChunk()), CH.unit)
          )

          return self.channel[">>>"](reader)
        })
      )
    )
  )
}

/**
 * Takes the last specified number of elements from this stream.
 *
 * @ets_data_first takeRight_
 */
export function takeRight(n: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => takeRight_(self, n)
}
