import type { ChildExecutorDecision } from "@effect/core/stream/Channel/ChildExecutorDecision"
import { ConcatAll } from "@effect/core/stream/Channel/definition/primitives"
import type { UpstreamPullRequest } from "@effect/core/stream/Channel/UpstreamPullRequest"
import type { UpstreamPullStrategy } from "@effect/core/stream/Channel/UpstreamPullStrategy"

/**
 * Returns a new channel whose outputs are fed to the specified factory
 * function, which creates new channels in response. These new channels are
 * sequentially concatenated together, and all their outputs appear as outputs
 * of the newly returned channel. The provided merging function is used to
 * merge the terminal values of all channels into the single terminal value of
 * the returned channel.
 *
 * @tsplus fluent ets/Channel concatMapWithCustom
 */
export function concatMapWithCustom_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
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
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (
    o: OutElem
  ) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
  g: (o: OutDone, o1: OutDone) => OutDone,
  h: (o: OutDone, o2: OutDone2) => OutDone3,
  onPull: (
    upstreamPullRequest: UpstreamPullRequest<OutElem>
  ) => UpstreamPullStrategy<OutElem2>,
  onEmit: (elem: OutElem2) => ChildExecutorDecision
): Channel<
  Env | Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem2,
  OutDone3
> {
  return new ConcatAll<
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
  >(g, h, onPull, onEmit, () => self, f)
}

/**
 * Returns a new channel whose outputs are fed to the specified factory
 * function, which creates new channels in response. These new channels are
 * sequentially concatenated together, and all their outputs appear as outputs
 * of the newly returned channel. The provided merging function is used to
 * merge the terminal values of all channels into the single terminal value of
 * the returned channel.
 *
 * @tsplus static ets/Channel/Aspects concatMapWithCustom
 */
export const concatMapWithCustom = Pipeable(concatMapWithCustom_)
