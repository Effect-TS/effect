import type { LazyArg } from "../../../data/Function"
import type { Promise } from "../../../io/Promise"
import type { Channel } from "../definition"

/**
 * Returns a new channel, which is the same as this one, except it will be
 * interrupted when the specified promise is completed. If the promise is
 * completed before the underlying channel is done, then the returned channel
 * will yield the value of the promise. Otherwise, if the underlying channel
 * finishes first, then the returned channel will yield the value of the
 * underlying channel.
 *
 * @tsplus fluent ets/Channel interruptWhenPromise
 */
export function interruptWhenPromise_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutDone,
  OutDone1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  promise: LazyArg<Promise<OutErr1, OutDone1>>
): Channel<Env, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone | OutDone1> {
  return self.interruptWhen(promise().await())
}

/**
 * Returns a new channel, which is the same as this one, except it will be
 * interrupted when the specified promise is completed. If the promise is
 * completed before the underlying channel is done, then the returned channel
 * will yield the value of the promise. Otherwise, if the underlying channel
 * finishes first, then the returned channel will yield the value of the
 * underlying channel.
 */
export const interruptWhenPromise = Pipeable(interruptWhenPromise_)
