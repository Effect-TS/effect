// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as CH from "../../Channel"
import type * as PP from "../../Pipeline/core"
import * as C from "../core"
import * as Empty from "./empty"
import * as FromChunk from "./fromChunk"

/**
 * Reads the first n values from the stream and uses them to choose the pipeline that will be
 * used for the remainder of the stream.
 */
export function branchAfter_<
  LowerEnv,
  UpperEnv,
  LowerErr,
  UpperErr,
  LowerElem,
  UpperElem
>(
  self: C.Stream<UpperEnv, UpperErr, UpperElem>,
  n: number,
  f: (
    a1: CK.Chunk<UpperElem>
  ) => PP.Pipeline<LowerEnv, UpperEnv, LowerErr, UpperErr, LowerElem, UpperElem>
) {
  const collecting = (
    buf: CK.Chunk<UpperElem>
  ): CH.Channel<
    LowerEnv,
    UpperErr | LowerErr,
    CK.Chunk<UpperElem>,
    unknown,
    UpperErr | LowerErr,
    CK.Chunk<UpperElem | LowerElem>,
    any
  > => {
    return CH.readWithCause(
      (chunk) => {
        const newBuf = CK.concat_(buf, chunk)

        if (CK.size(newBuf) >= n) {
          const {
            tuple: [is, is1]
          } = CK.splitAt_(newBuf, n)
          const pipeline = f(is)

          return CH.zipRight_(
            pipeline.pipeline(FromChunk.fromChunk(is1)).channel,
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

          return pipeline.pipeline(Empty.empty).channel
        }
      }
    )
  }

  const emitting = (
    pipeline: PP.Pipeline<LowerEnv, UpperEnv, LowerErr, UpperErr, LowerElem, UpperElem>
  ): CH.Channel<
    LowerEnv,
    UpperErr | LowerErr,
    CK.Chunk<UpperElem>,
    unknown,
    UpperErr | LowerErr,
    CK.Chunk<UpperElem | LowerElem>,
    any
  > =>
    CH.readWithCause(
      (chunk) =>
        CH.zipRight_(
          pipeline.pipeline(FromChunk.fromChunk(chunk)).channel,
          emitting(pipeline)
        ),
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
export function branchAfter<
  LowerEnv,
  UpperEnv,
  LowerErr,
  UpperErr,
  LowerElem,
  UpperElem
>(
  n: number,
  f: (
    a1: CK.Chunk<UpperElem>
  ) => PP.Pipeline<LowerEnv, UpperEnv, LowerErr, UpperErr, LowerElem, UpperElem>
) {
  return (self: C.Stream<UpperEnv, UpperErr, UpperElem>) => branchAfter_(self, n, f)
}
