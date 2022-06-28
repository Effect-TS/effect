/**
 * Runs a channel until the end is received.
 *
 * @tsplus getter effect/core/stream/Channel run
 */
export function run<Env, InErr, InDone, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): Effect<Env, OutErr, OutDone> {
  return Effect.scoped(self.runScoped)
}
