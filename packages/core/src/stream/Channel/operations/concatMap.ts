/**
 * Returns a new channel whose outputs are fed to the specified factory
 * function, which creates new channels in response. These new channels are
 * sequentially concatenated together, and all their outputs appear as outputs
 * of the newly returned channel.
 *
 * @tsplus static effect/core/stream/Channel.Aspects concatMap
 * @tsplus pipeable effect/core/stream/Channel concatMap
 * @category mutations
 * @since 1.0.0
 */
export function concatMap<
  OutElem,
  OutElem2,
  OutDone2,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env | Env2,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr | OutErr2,
    OutElem2,
    unknown
  > => self.concatMapWith(f, () => undefined, () => undefined)
}
