// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as AR from "../../../Support/AtomicReference/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

export function foldSink_<
  R,
  R1,
  R2,
  InErr,
  InErr1,
  InErr2,
  In,
  In1 extends In,
  In2 extends In,
  OutErr,
  OutErr2,
  OutErr3,
  L,
  L1 extends L,
  L2 extends L,
  Z,
  Z1,
  Z2
>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  failure: (err: OutErr) => C.Sink<R1, InErr1, In1, OutErr2, L1, Z1>,
  success: (z: Z) => C.Sink<R2, InErr2, In2, OutErr3, L2, Z2>
): C.Sink<
  R & R1 & R2,
  InErr & InErr1 & InErr2,
  In1 & In2,
  OutErr2 | OutErr3,
  L1 | L2,
  Z1 | Z2
> {
  return new C.Sink(
    CH.foldChannel_(
      CH.doneCollect(self.channel),
      (_) => failure(_).channel,
      ({ tuple: [leftovers, z] }) =>
        CH.suspend(() => {
          const leftoversRef = new AR.AtomicReference(
            CK.filter_(leftovers, (a): a is CK.Chunk<L1 | L2> => !CK.isEmpty(a))
          )
          const refReader = CH.chain_(
            CH.succeedWith(() => leftoversRef.getAndSet(CK.empty())),
            (chunk) => CH.writeChunk(chunk as unknown as CK.Chunk<CK.Chunk<In1 & In2>>)
          )
          const passthrough = CH.identity<InErr2, CK.Chunk<In1 & In2>, unknown>()
          const continationSink = CH.zipRight_(refReader, passthrough)[">>>"](
            success(z).channel
          )

          return CH.chain_(
            CH.doneCollect(continationSink),
            ({ tuple: [newLeftovers, z1] }) =>
              CH.zipRight_(
                CH.chain_(
                  CH.succeedWith(() => leftoversRef.get),
                  (_) => CH.writeChunk(_)
                ),
                CH.as_(CH.writeChunk(newLeftovers), z1)
              )
          )
        })
    )
  )
}

/**
 *
 * @ets_data_first foldSink_
 */
export function foldSink<
  R1,
  R2,
  InErr1,
  InErr2,
  In,
  In1 extends In,
  In2 extends In,
  OutErr,
  OutErr2,
  OutErr3,
  L,
  L1 extends L,
  L2 extends L,
  Z,
  Z1,
  Z2
>(
  failure: (err: OutErr) => C.Sink<R1, InErr1, In1, OutErr2, L1, Z1>,
  success: (z: Z) => C.Sink<R2, InErr2, In2, OutErr3, L2, Z2>
) {
  return <R, InErr>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    foldSink_(self, failure, success)
}
