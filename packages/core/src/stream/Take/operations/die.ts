import { TakeInternal } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Creates a failing `Take<never, never>` with the specified defect.
 *
 * @tsplus static effect/core/stream/Take.Ops die
 * @category constructors
 * @since 1.0.0
 */
export function die(defect: unknown): Take<never, never> {
  return new TakeInternal(Exit.die(defect))
}
