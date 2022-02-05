// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import * as MH from "../_internal/mergeHelpers.js"
import * as C from "../core.js"
import * as MergeWith from "./mergeWith.js"

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified effect completes. If the effect completes successfully before the underlying channel
 * is done, then the returned channel will yield the success value of the effect as its terminal
 * value. On the other hand, if the underlying channel finishes first, then the returned channel
 * will yield the success value of the underlying channel as its terminal value.
 */
export function interruptWhen_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutDone,
  OutDone1
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  io: T.Effect<Env1, OutErr1, OutDone1>
): C.Channel<
  Env1 & Env,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1,
  OutElem,
  OutDone | OutDone1
> {
  return MergeWith.mergeWith_(
    self,
    C.fromEffect(io),
    (selfDone) => MH.done(T.done(selfDone)),
    (ioDone) => MH.done(T.done(ioDone))
  )
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified effect completes. If the effect completes successfully before the underlying channel
 * is done, then the returned channel will yield the success value of the effect as its terminal
 * value. On the other hand, if the underlying channel finishes first, then the returned channel
 * will yield the success value of the underlying channel as its terminal value.
 *
 * @ets_data_first interruptWhen_
 */
export function interruptWhen<Env1, OutErr1, OutDone1>(
  io: T.Effect<Env1, OutErr1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => interruptWhen_(self, io)
}
