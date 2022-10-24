/**
 * Runs a channel until the end is received.
 *
 * @tsplus getter effect/core/stream/Channel runDrain
 * @category destructors
 * @since 1.0.0
 */
export function runDrain<Env, InErr, InDone, OutElem, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): Effect<Env, OutErr, OutDone> {
  return self.drain.run
}
