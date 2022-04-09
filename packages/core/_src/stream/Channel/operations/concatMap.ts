/**
 * Returns a new channel whose outputs are fed to the specified factory
 * function, which creates new channels in response. These new channels are
 * sequentially concatenated together, and all their outputs appear as outputs
 * of the newly returned channel.
 *
 * @tsplus fluent ets/Channel concatMap
 */
export function concatMap_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>
): Channel<
  Env & Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem2,
  unknown
> {
  return self.concatMapWith(f, () => undefined, () => undefined);
}

/**
 * Returns a new channel whose outputs are fed to the specified factory
 * function, which creates new channels in response. These new channels are
 * sequentially concatenated together, and all their outputs appear as outputs
 * of the newly returned channel.
 *
 * @tsplus static ets/Channel/Aspects concatMap
 */
export const concatMap = Pipeable(concatMap_);
