/**
 * @tsplus static effect/core/stream/Channel.Aspects orDie
 * @tsplus pipeable effect/core/stream/Channel orDie
 */
export function orDie<E>(error: LazyArg<E>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem, InDone, never, OutElem, OutDone> => self.orDieWith(error)
}
