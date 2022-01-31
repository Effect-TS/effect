// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as C from "../core.js"
import * as ReadWith from "./readWith.js"
import * as ZipRight from "./zipRight.js"

function doneCollectReader<Env, OutErr, OutElem, OutDone>(
  builder: CK.ChunkBuilder<OutElem>
): C.Channel<Env, OutErr, OutElem, OutDone, OutErr, never, OutDone> {
  return ReadWith.readWith(
    (out) =>
      ZipRight.zipRight_(
        C.succeedWith(() => {
          builder.append(out)
        }),
        doneCollectReader(builder)
      ),
    (err) => C.fail(err),
    (done) => C.end(done)
  )
}

/**
 * Returns a new channel, which is the same as this one, except that all the outputs are
 * collected and bundled into a tuple together with the terminal value of this channel.
 *
 * As the channel returned from this channel collect's all of this channel's output into an in-
 * memory chunk, it is not safe to call this method on channels that output a large or unbounded
 * number of values.
 */
export function doneCollect<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): C.Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  never,
  Tp.Tuple<[CK.Chunk<OutElem>, OutDone]>
> {
  return C.suspend(() => {
    const builder = CK.builder<OutElem>()

    return C.chain_(C.pipeTo_(self, doneCollectReader(builder)), (z) =>
      C.succeedWith(() => Tp.tuple(builder.build(), z))
    )
  })
}
