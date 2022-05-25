/**
 * Runs a channel until the end is received.
 *
 * @tsplus fluent ets/Channel runDrain
 */
export function runDrain<Env, InErr, InDone, OutElem, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): Effect<Env, OutErr, OutDone> {
  return self.drain().run()
}
