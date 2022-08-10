/**
 * A more powerful version of `mapError` which also surfaces the `Cause`
 * of the channel failure.
 *
 * @tsplus static effect/core/stream/Channel.Aspects mapErrorCause
 * @tsplus pipeable effect/core/stream/Channel mapErrorCause
 */
export function mapErrorCause<OutErr, OutErr2>(
  f: (cause: Cause<OutErr>) => Cause<OutErr2>
) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> =>
    self.catchAllCause((cause) => Channel.failCauseSync(f(cause)))
}
