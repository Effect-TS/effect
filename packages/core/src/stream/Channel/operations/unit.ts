/**
 * @tsplus static effect/core/stream/Channel.Ops unit
 * @category constructors
 * @since 1.0.0
 */
export const unit: Channel<never, unknown, unknown, unknown, never, never, void> = Channel.succeed(
  undefined
)

/**
 * Ignores the result of the effect replacing it with a void
 *
 * @tsplus getter effect/core/stream/Channel unit
 * @category mapping
 * @since 1.0.0
 */
export function asUnit<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, void> {
  return self.flatMap(() => Channel.unit)
}
