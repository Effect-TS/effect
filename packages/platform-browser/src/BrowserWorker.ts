/**
 * @since 1.0.0
 */
import type * as Worker from "@effect/platform/Worker"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/worker.js"
/**
 * @since 1.0.0
 * @category layers
 */
export const layerManager: Layer.Layer<Worker.WorkerManager> = internal.layerManager

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWorker: Layer.Layer<Worker.PlatformWorker> = internal.layerWorker

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (
  spawn: Worker.SpawnerFn<Worker | SharedWorker>
) => Layer.Layer<Worker.WorkerManager | Worker.Spawner, never, never> = internal.layer
