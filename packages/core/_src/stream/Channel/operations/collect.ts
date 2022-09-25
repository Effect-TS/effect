/**
 * Returns a new channel, which is the same as this one, except its outputs
 * are filtered and transformed by the specified partial function.
 *
 * @tsplus static effect/core/stream/Channel.Aspects collect
 * @tsplus pipeable effect/core/stream/Channel collect
 */
export function collect<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone
>(pf: (o: OutElem) => Maybe<OutElem2>) {
  return (
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> => {
    const collector: Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> = Channel
      .readWith(
        (out) => pf(out).fold(collector, (out2) => Channel.write(out2).flatMap(() => collector)),
        (e) => Channel.fail(e),
        (z) => Channel.succeed(z)
      )
    return self >> collector
  }
}
