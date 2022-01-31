// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"
import * as Empty from "./empty.js"
import * as FromChunk from "./fromChunk.js"

interface Pipeline<R, R1, E, E1, A, B> {
  (stream: C.Stream<R, E, A>): C.Stream<R1, E1, B>
}

/**
 * Reads the first n values from the stream and uses them to choose the pipeline that will be
 * used for the remainder of the stream.
 */
export function branchAfter_<R, R1, E, E1, A>(
  self: C.Stream<R, E, A>,
  n: number,
  f: (a1: CK.Chunk<A>) => Pipeline<R, R1, E, E1, A, A>
): C.Stream<R & R1, E | E1, A> {
  const collecting = (
    buf: CK.Chunk<A>
  ): CH.Channel<R1, E | E1, CK.Chunk<A>, unknown, E | E1, CK.Chunk<A>, any> =>
    CH.readWithCause(
      (chunk) => {
        const newBuf = CK.concat_(buf, chunk)

        if (CK.size(newBuf) >= n) {
          const {
            tuple: [is, is1]
          } = CK.splitAt_(newBuf, n)
          const pipeline = f(is)

          return CH.zipRight_(
            pipeline(FromChunk.fromChunk(is1)).channel,
            emitting(pipeline)
          )
        } else {
          return collecting(newBuf)
        }
      },
      (_) => CH.failCause(_),
      (_) => {
        if (CK.isEmpty(buf)) {
          return CH.unit
        } else {
          const pipeline = f(buf)

          return pipeline(Empty.empty).channel
        }
      }
    )

  const emitting = (
    pipeline: Pipeline<R, R1, E, E1, A, A>
  ): CH.Channel<R1, E | E1, CK.Chunk<A>, unknown, E | E1, CK.Chunk<A>, any> =>
    CH.readWithCause(
      (chunk) =>
        CH.zipRight_(pipeline(FromChunk.fromChunk(chunk)).channel, emitting(pipeline)),
      (_) => CH.failCause(_),
      (_) => CH.unit
    )

  return new C.Stream(self.channel[">>>"](collecting(CK.empty())))
}

/**
 * Reads the first n values from the stream and uses them to choose the pipeline that will be
 * used for the remainder of the stream.
 *
 * @ets_data_first branchAfter_
 */
export function branchAfter<R, R1, E, E1, A>(
  n: number,
  f: (a1: CK.Chunk<A>) => Pipeline<R, R1, E, E1, A, A>
) {
  return (self: C.Stream<R, E, A>) => branchAfter_(self, n, f)
}
