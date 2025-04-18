/**
 * @since 1.0.0
 */
import type * as Runner from "@effect/platform/WorkerRunner"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/workerRunner.js"

export {
  /**
   * @since 1.0.0
   * @category re-exports
   */
  launch
} from "@effect/platform/WorkerRunner"

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Runner.PlatformRunner> = internal.layer
