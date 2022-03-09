import { Channel } from "../definition"

/**
 * Accesses the environment of the channel.
 *
 * @tsplus static ets/ChannelOps environmentWith
 */
export function environmentWith<Env, OutDone>(
  f: (env: Env) => OutDone
): Channel<Env, unknown, unknown, unknown, never, never, OutDone> {
  return Channel.environment<Env>().map(f)
}
