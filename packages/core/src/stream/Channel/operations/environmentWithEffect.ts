import type { Effect } from "../../../io/Effect"
import { Channel } from "../definition"

/**
 * Accesses the environment of the channel in the context of an effect.
 *
 * @tsplus static ets/ChannelOps environmentWithEffect
 */
export function environmentWithEffect<Env, Env1, OutErr, OutDone>(
  f: (env: Env) => Effect<Env1, OutErr, OutDone>
): Channel<Env & Env1, unknown, unknown, unknown, OutErr, never, OutDone> {
  return Channel.environment<Env>().mapEffect(f)
}
