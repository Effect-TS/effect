/**
 * @tsplus static effect/core/stream/Channel.Aspects ensuring
 * @tsplus pipeable effect/core/stream/Channel ensuring
 * @category finalizers
 * @since 1.0.0
 */
export function ensuring<Env1, Z>(finalizer: Effect<Env1, never, Z>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env | Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    self.ensuringWith(() => finalizer)
}
