/**
 * @tsplus fluent ets/Channel ensuring
 */
export function ensuring_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Z
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: LazyArg<RIO<Env1, Z>>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return self.ensuringWith(finalizer);
}

/**
 * @tsplus static ets/Channel/Aspects ensuring
 */
export const ensuring = Pipeable(ensuring_);
