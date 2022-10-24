import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Returns a new channel, which is the same as this one, except its outputs
 * are filtered and transformed by the specified partial function.
 *
 * @tsplus static effect/core/stream/Channel.Aspects collect
 * @tsplus pipeable effect/core/stream/Channel collect
 * @category mutations
 * @since 1.0.0
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
>(pf: (o: OutElem) => Option.Option<OutElem2>) {
  return (
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> => {
    const collector: Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> = Channel
      .readWith(
        (out) =>
          pipe(
            pf(out),
            Option.match(
              () => collector,
              (out2) => Channel.write(out2).flatMap(() => collector)
            )
          ),
        (e) => Channel.fail(e),
        (z) => Channel.succeed(z)
      )
    return self >> collector
  }
}
