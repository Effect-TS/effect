/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/Worker`](https://effect-ts.github.io/platform/platform/Worker.ts.html).
 */
import type * as Worker from "@effect/platform/Worker"
import type * as Schema from "@effect/schema/Schema"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as internal from "./internal/worker.js"

/**
 * @since 1.0.0
 */
export * from "@effect/platform/Worker"

/**
 * @since 1.0.0
 * @category constructors
 */
export const makePool: <I, E, O>(
  options: Worker.WorkerPool.Options<I, Worker | SharedWorker>
) => Effect.Effect<Worker.WorkerManager | Scope.Scope, never, Worker.WorkerPool<I, E, O>> = internal.makePool

/**
 * @since 1.0.0
 * @category constructors
 */
export const makePoolLayer: <Tag, I, E, O>(
  tag: Context.Tag<Tag, Worker.WorkerPool<I, E, O>>,
  options: Worker.WorkerPool.Options<I, Worker | SharedWorker>
) => Layer.Layer<never, never, Tag> = internal.makePoolLayer

/**
 * @since 1.0.0
 * @category constructors
 */
export const makePoolSerialized: <I extends Schema.TaggedRequest.Any>(
  options: Worker.SerializedWorkerPool.Options<I, Worker | SharedWorker>
) => Effect.Effect<Worker.WorkerManager | Scope.Scope, never, Worker.SerializedWorkerPool<I>> =
  internal.makePoolSerialized

/**
 * @since 1.0.0
 * @category constructors
 */
export const makePoolSerializedLayer: <Tag, I extends Schema.TaggedRequest.Any>(
  tag: Context.Tag<Tag, Worker.SerializedWorkerPool<I>>,
  options: Worker.SerializedWorkerPool.Options<I, Worker | SharedWorker>
) => Layer.Layer<never, never, Tag> = internal.makePoolSerializedLayer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerManager: Layer.Layer<never, never, Worker.WorkerManager> = internal.layerManager

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWorker: Layer.Layer<never, never, Worker.PlatformWorker> = internal.layerWorker
