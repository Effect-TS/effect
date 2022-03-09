import type { LazyArg } from "../../../data/Function"
import type { Effect, RIO } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import type { Channel } from "../definition"
import { BracketOut } from "../definition"

/**
 * @tsplus static ets/ChannelOps acquireReleaseOutExitWith
 */
export function acquireReleaseOutExitWith_<R, R2, E, Z>(
  self: LazyArg<Effect<R, E, Z>>,
  release: (z: Z, e: Exit<unknown, unknown>) => RIO<R2, unknown>
): Channel<R & R2, unknown, unknown, unknown, E, Z, void> {
  return new BracketOut<R & R2, E, Z, void>(self, release)
}

export const acquireReleaseOutExitWith = Pipeable(acquireReleaseOutExitWith_)
