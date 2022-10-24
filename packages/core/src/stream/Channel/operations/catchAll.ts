/**
 * Returns a new channel that is the same as this one, except if this channel
 * errors for any typed error, then the returned channel will switch over to
 * using the fallback channel returned by the specified error handler.
 *
 * @tsplus static effect/core/stream/Channel.Aspects catchAll
 * @tsplus pipeable effect/core/stream/Channel catchAll
 * @category alternatives
 * @since 1.0.0
 */
export function catchAll<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr,
  OutErr1,
  OutElem1,
  OutDone1
>(f: (error: OutErr) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1,
    OutElem | OutElem1,
    OutDone | OutDone1
  > =>
    self.catchAllCause((cause) => {
      const either = cause.failureOrCause
      switch (either._tag) {
        case "Left": {
          return f(either.left)
        }
        case "Right": {
          return Channel.failCause(either.right)
        }
      }
    })
}
