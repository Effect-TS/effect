/**
 * Returns a new channel, which is the same as this one, except its outputs
 * are filtered and transformed by the specified partial function.
 *
 * @tsplus fluent ets/Channel collect
 */
export function collect_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  pf: (o: OutElem) => Maybe<OutElem2>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  const collector: Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> = Channel.readWith(
    (out) => pf(out).fold(collector, (out2) => Channel.write(out2) > collector),
    (e) => Channel.fail(e),
    (z) => Channel.succeedNow(z)
  )

  return self >> collector
}

/**
 * Returns a new channel, which is the same as this one, except its outputs
 * are filtered and transformed by the specified partial function.
 *
 * @tsplus static ets/Channel/Aspects collect
 */
export const collect = Pipeable(collect_)
