/**
 * @tsplus static ets/Channel/Ops acquireUseRelease
 */
export function acquireUseRelease<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem1,
  OutDone,
  Acquired
>(
  acquire: Effect<Env, OutErr, Acquired>,
  use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired) => Effect.RIO<Env, any>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return Channel.acquireUseReleaseExit(acquire, use, (a, _) => release(a));
}
