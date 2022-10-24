import { MergeStrategy } from "@effect/core/stream/Channel/MergeStrategy"

/**
 * @tsplus static effect/core/stream/Channel.Ops mergeAll
 * @category mutations
 * @since 1.0.0
 */
export function mergeAll<
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
  OutElem
>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, unknown>,
    unknown
  >,
  n: number,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = MergeStrategy.BackPressure
): Channel<
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem,
  unknown
> {
  return Channel.mergeAllWith(channels, n, () => undefined, bufferSize, mergeStrategy)
}
