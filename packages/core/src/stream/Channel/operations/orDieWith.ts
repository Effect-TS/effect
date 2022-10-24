/**
 * @tsplus static effect/core/stream/Channel.Aspects orDieWith
 * @tsplus pipeable effect/core/stream/Channel orDieWith
 * @category alternatives
 * @since 1.0.0
 */
export function orDieWith<OutErr>(f: (e: OutErr) => unknown) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem, InDone, never, OutElem, OutDone> =>
    self.catchAll((e) => {
      throw f(e)
    })
}
