import { TakeInternal } from "@effect-ts/core/stream/Take/operations/_internal/TakeInternal";

/**
 * Creates a failing `Take<never, never>` with the specified error message.
 *
 * @tsplus static ets/Take/Ops dieMessage
 */
export function dieMessage(message: string): Take<never, never> {
  return new TakeInternal(Exit.die(new RuntimeError(message)));
}
