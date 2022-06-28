import { constVoid } from "@tsplus/stdlib/data/Function"

/**
 * @tsplus static effect/core/stream/Channel.Ops unit
 */
export const unit: Channel<never, unknown, unknown, unknown, never, never, void> = Channel.succeed(constVoid)

/**
 * Ignores the result of the effect replacing it with a void
 *
 * @tsplus getter effect/core/stream/Channel unit
 */
export function unit_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, void> {
  return self > Channel.unit
}
