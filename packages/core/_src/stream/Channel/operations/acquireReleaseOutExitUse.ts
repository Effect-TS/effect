import { BracketOut } from "@effect/core/stream/Channel/definition/primitives";

/**
 * @tsplus static ets/Channel/Ops acquireReleaseOutExitUse
 */
export function acquireReleaseOutExitUse_<R, R2, E, Z>(
  self: LazyArg<Effect<R, E, Z>>,
  release: (z: Z, e: Exit<unknown, unknown>) => Effect.RIO<R2, unknown>
): Channel<R & R2, unknown, unknown, unknown, E, Z, void> {
  return new BracketOut<R & R2, E, Z, void>(self, release);
}

/**
 * @tsplus static ets/Channel/Aspects acquireReleaseOutExitUse
 */
export const acquireReleaseOutExitUse = Pipeable(acquireReleaseOutExitUse_);
