import { identity } from "@fp-ts/data/Function"

/**
 * @tsplus static effect/core/stream/Channel.Aspects mergeOut
 * @tsplus pipeable effect/core/stream/Channel mergeOut
 * @category mutations
 * @since 1.0.0
 */
export function mergeOut(n: number) {
  return <
    Env,
    Env1,
    InErr,
    InErr1,
    InElem,
    InElem1,
    InDone,
    InDone1,
    OutErr,
    OutErr1,
    OutElem1,
    OutDone,
    Z
  >(
    self: Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
      OutDone
    >
  ): Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem1,
    unknown
  > => Channel.mergeAll(self.mapOut(identity), n)
}
