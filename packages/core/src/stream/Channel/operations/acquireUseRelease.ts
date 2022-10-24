/**
 * @tsplus static effect/core/stream/Channel.Ops acquireUseRelease
 * @category acquire/release
 * @since 1.0.0
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
  release: (a: Acquired) => Effect<Env, never, any>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return Channel.acquireUseReleaseExit(acquire, use, (a, _) => release(a))
}
