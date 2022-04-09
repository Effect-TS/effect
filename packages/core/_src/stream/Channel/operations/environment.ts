/**
 * Accesses the whole environment of the channel.
 *
 * @tsplus static ets/Channel/Ops environment
 */
export function environment<Env>(): Channel<Env, unknown, unknown, unknown, never, never, Env> {
  return Channel.fromEffect(Effect.environment<Env>());
}
