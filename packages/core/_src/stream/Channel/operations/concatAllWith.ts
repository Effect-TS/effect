import { ChildExecutorDecision } from "@effect/core/stream/Channel/ChildExecutorDecision"
import { ConcatAll } from "@effect/core/stream/Channel/definition/primitives"
import { UpstreamPullStrategy } from "@effect/core/stream/Channel/UpstreamPullStrategy"

/**
 * Concat sequentially a channel of channels.
 *
 * @tsplus static effect/core/stream/Channel.Ops concatAllWith
 */
export function concatAllWith<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  OutDone2,
  OutDone3,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  channels: LazyArg<
    Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
      OutDone2
    >
  >,
  f: (o: OutDone, o1: OutDone) => OutDone,
  g: (o: OutDone, o2: OutDone2) => OutDone3
): Channel<
  Env | Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem,
  OutDone3
> {
  return new ConcatAll<
    Env | Env2,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr | OutErr2,
    OutElem,
    OutDone3,
    Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
    OutDone,
    OutDone2
  >(
    f,
    g,
    () => UpstreamPullStrategy.PullAfterNext(Maybe.none),
    () => ChildExecutorDecision.Continue,
    channels,
    identity
  )
}
