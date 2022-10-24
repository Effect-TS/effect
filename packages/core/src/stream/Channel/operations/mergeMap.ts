import { MergeStrategy } from "@effect/core/stream/Channel/MergeStrategy"

/**
 * @tsplus static effect/core/stream/Channel.Aspects mergeMap
 * @tsplus pipeable effect/core/stream/Channel mergeMap
 * @category mutations
 * @since 1.0.0
 */
export function mergeMap<OutElem, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>(
  n: number,
  f: (outElem: OutElem) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = MergeStrategy.BackPressure
) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem1,
    unknown
  > => Channel.mergeAll(self.mapOut(f), n, bufferSize, mergeStrategy)
}
