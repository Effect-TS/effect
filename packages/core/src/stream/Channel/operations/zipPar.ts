import { MergeDecision } from "@effect/core/stream/Channel/MergeDecision"

/**
 * @tsplus static effect/core/stream/Channel.Aspects zipPar
 * @tsplus pipeable effect/core/stream/Channel zipPar
 * @category zipping
 * @since 1.0.0
 */
export function zipPar<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    readonly [OutDone, OutDone1]
  > =>
    self.mergeWith(
      that,
      (exit1) => MergeDecision.await((exit2) => Effect.done(exit1.zip(exit2))),
      (exit2) => MergeDecision.await((exit1) => Effect.done(exit1.zip(exit2)))
    )
}
