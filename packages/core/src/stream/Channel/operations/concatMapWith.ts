import { ChildExecutorDecision } from "@effect/core/stream/Channel/ChildExecutorDecision"
import { ConcatAll } from "@effect/core/stream/Channel/definition/primitives"
import { UpstreamPullStrategy } from "@effect/core/stream/Channel/UpstreamPullStrategy"
import * as Option from "@fp-ts/data/Option"

/**
 * Returns a new channel whose outputs are fed to the specified factory
 * function, which creates new channels in response. These new channels are
 * sequentially concatenated together, and all their outputs appear as outputs
 * of the newly returned channel. The provided merging function is used to
 * merge the terminal values of all channels into the single terminal value of
 * the returned channel.
 *
 * @tsplus static effect/core/stream/Channel.Aspects concatMapWith
 * @tsplus pipeable effect/core/stream/Channel concatMapWith
 * @category mutations
 * @since 1.0.0
 */
export function concatMapWith<
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  f: (
    o: OutElem
  ) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
  g: (o: OutDone, o1: OutDone) => OutDone,
  h: (o: OutDone, o2: OutDone2) => OutDone3
) {
  return <Env, InErr, InElem, InDone, OutErr>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
  ): Channel<
    Env | Env2,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr | OutErr2,
    OutElem2,
    OutDone3
  > =>
    new ConcatAll<
      Env | Env2,
      InErr & InErr2,
      InElem & InElem2,
      InDone & InDone2,
      OutErr | OutErr2,
      OutElem2,
      OutDone3,
      OutElem,
      OutDone,
      OutDone2
    >(
      g,
      h,
      () => UpstreamPullStrategy.PullAfterNext(Option.none),
      () => ChildExecutorDecision.Continue,
      () => self,
      f
    )
}
