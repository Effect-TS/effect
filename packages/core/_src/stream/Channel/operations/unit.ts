/**
 * @tsplus static ets/Channel/Ops unit
 */
export const unit: Channel<never, unknown, unknown, unknown, never, never, void> = Channel.succeed(() => undefined)

/**
 * Ignores the result of the effect replacing it with a void
 *
 * @tsplus getter ets/Channel unit
 */
export function unit_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, void> {
  return self > Channel.unit
}
