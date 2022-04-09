/**
 * @tsplus static ets/Channel/Ops scoped
 */
export function scoped<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutDone,
  A
>(
  effect: LazyArg<Effect<Env & HasScope, OutErr, A>>,
  use: (a: A) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem, OutDone>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone> {
  return Channel.acquireReleaseExitUse(
    Scope.make,
    (scope) => Channel.fromEffect<Env, OutErr, A>(scope.extend(effect)).flatMap(use),
    (scope, exit) => scope.close(exit)
  );
}
