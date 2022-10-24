import { Suspend } from "@effect/core/stream/Channel/definition/primitives"

/**
 * @tsplus static effect/core/stream/Channel.Ops suspend
 * @category constructors
 * @since 1.0.0
 */
export function suspend<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  effect: LazyArg<Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Suspend(effect)
}
