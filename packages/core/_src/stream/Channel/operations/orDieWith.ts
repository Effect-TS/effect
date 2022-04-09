/**
 * @tsplus fluent ets/Channel orDieWith
 */
export function orDieWith_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (e: OutErr) => unknown
): Channel<Env, InErr, InElem, InDone, never, OutElem, OutDone> {
  return self.catchAll((e) => {
    throw f(e);
  });
}

/**
 * @tsplus static ets/Channel/Aspects orDieWith
 */
export const orDieWith = Pipeable(orDieWith_);
