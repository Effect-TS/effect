/**
 * Returns a new channel which reads all the elements from upstream's output
 * channel and ignores them, then terminates with the upstream result value.
 *
 * @tsplus fluent ets/Channel drain
 */
export function drain<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, never, OutDone> {
  const drainer: Channel<Env, OutErr, OutElem, OutDone, OutErr, never, OutDone> = Channel.readWithCause(
    () => drainer,
    (cause) => Channel.failCause(cause),
    Channel.succeedNow
  )
  return self >> drainer
}
