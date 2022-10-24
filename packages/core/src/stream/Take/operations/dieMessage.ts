import { TakeInternal } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Creates a failing `Take<never, never>` with the specified error message.
 *
 * @tsplus static effect/core/stream/Take.Ops dieMessage
 * @category constructors
 * @since 1.0.0
 */
export function dieMessage(message: string): Take<never, never> {
  return new TakeInternal(Exit.die(new RuntimeError(message)))
}
