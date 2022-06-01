import { MergeDecision } from "@effect/core/stream/Channel/MergeDecision"

/**
 * Returns a new channel, which is the same as this one, except it will be
 * interrupted when the specified effect completes. If the effect completes
 * successfully before the underlying channel is done, then the returned
 * channel will yield the success value of the effect as its terminal value.
 * On the other hand, if the underlying channel finishes first, then the
 * returned channel will yield the success value of the underlying channel as
 * its terminal value.
 *
 * @tsplus fluent ets/Channel interruptWhen
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
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  io: LazyArg<Effect<Env1, OutErr1, OutDone1>>
): Channel<
  Env1 | Env,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1,
  OutElem,
  OutDone | OutDone1
> {
  return self.mergeWith(
    Channel.fromEffect(io),
    (selfDone) => MergeDecision.done(Effect.done(selfDone)),
    (ioDone) => MergeDecision.done(Effect.done(ioDone))
  )
}

/**
 * Returns a new channel, which is the same as this one, except it will be
 * interrupted when the specified effect completes. If the effect completes
 * successfully before the underlying channel is done, then the returned
 * channel will yield the success value of the effect as its terminal value.
 * On the other hand, if the underlying channel finishes first, then the
 * returned channel will yield the success value of the underlying channel as
 * its terminal value.
 *
 * @tsplus static ets/Channel/Aspects interruptWhen
 */
export const interruptWhen = Pipeable(interruptWhen_)
