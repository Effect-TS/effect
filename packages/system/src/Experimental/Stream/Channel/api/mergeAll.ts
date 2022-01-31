// ets_tracing: off

import type * as C from "../core.js"
import * as MergeAllWith from "./mergeAllWith.js"

export function mergeAll_<Env, InErr, InElem, InDone, OutErr, OutElem>(
  channels: C.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
    any
  >,
  n: number,
  bufferSize = 16,
  mergeStrategy: MergeAllWith.MergeStrategy = "BackPressure"
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return MergeAllWith.mergeAllWith_(
    channels,
    n,
    (_, __) => void 0,
    bufferSize,
    mergeStrategy
  )
}

/**
 * @ets_data_first mergeAll_
 */
export function mergeAll(
  n: number,
  bufferSize = 16,
  mergeStrategy: MergeAllWith.MergeStrategy = "BackPressure"
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    channels: C.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
      any
    >
  ) => mergeAll_(channels, n, bufferSize, mergeStrategy)
}

export { MergeStrategy } from "./mergeAllWith.js"
