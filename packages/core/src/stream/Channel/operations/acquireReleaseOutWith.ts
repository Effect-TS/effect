import type { Effect, RIO } from "../../../io/Effect"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps acquireReleaseOutWith
 */
export function acquireReleaseOutWith<Env, OutErr, Acquired, Z>(
  acquire: Effect<Env, OutErr, Acquired>,
  release: (a: Acquired) => RIO<Env, Z>
): Channel<Env, unknown, unknown, unknown, OutErr, Acquired, void> {
  return Channel.acquireReleaseOutExitWith(acquire, (z, _) => release(z))
}
