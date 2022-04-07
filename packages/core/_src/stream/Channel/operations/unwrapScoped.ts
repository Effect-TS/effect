/**
 * Makes a channel from a managed that returns a channel in case of success.
 *
 * @tsplus static ets/Channel/Ops unwrapScoped
 */
export function unwrapScoped<
  R,
  E,
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: Effect<
    R & Has<Scope>,
    E,
    Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  >
): Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return Channel.concatAllWith(
    Channel.scopedOut(self),
    (d, _) => d,
    (d, _) => d
  );
}
