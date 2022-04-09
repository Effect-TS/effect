import { MergeDecision } from "@effect/core/stream/Channel/MergeDecision";

/**
 * @tsplus fluent ets/Channel zipPar
 */
export function zipPar_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  Tuple<[OutDone, OutDone1]>
> {
  return self.mergeWith(
    that,
    (exit1) => MergeDecision.await((exit2) => Effect.done(exit1.zip(exit2))),
    (exit2) => MergeDecision.await((exit1) => Effect.done(exit1.zip(exit2)))
  );
}

/**
 * @tsplus static ets/Channel/Aspects zipPar
 */
export const zipPar = Pipeable(zipPar_);
