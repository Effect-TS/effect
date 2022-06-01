/**
 * @tsplus fluent ets/Channel zipParRight
 */
export function zipParRight_<
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
  OutElem,
  OutElem1,
  OutDone,
  OutDone1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env1 | Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone1
> {
  return self.zipPar(that).map((tuple) => tuple.get(1))
}

/**
 * @tsplus static ets/Channel/Aspects zipParRight
 */
export const zipParRight = Pipeable(zipParRight_)
