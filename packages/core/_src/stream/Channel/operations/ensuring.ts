/**
 * @tsplus static effect/core/stream/Channel.Aspects ensuring
 * @tsplus pipeable effect/core/stream/Channel ensuring
 */
export function ensuring<Env1, Z>(finalizer: LazyArg<Effect<Env1, never, Z>>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env | Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    self.ensuringWith(finalizer)
}
