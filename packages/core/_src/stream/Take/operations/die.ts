import { TakeInternal } from "@effect-ts/core/stream/Take/operations/_internal/TakeInternal";

/**
 * Creates a failing `Take<never, never>` with the specified defect.
 *
 * @tsplus static ets/Take/Ops die
 */
export function die(defect: unknown): Take<never, never> {
  return new TakeInternal(Exit.die(defect));
}
