/**
 * @since 1.0.0
 */
import type * as Worker from "@effect/platform/Worker"
import type * as Schema from "@effect/schema/Schema"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as WorkerThreads from "node:worker_threads"
import * as internal from "./internal/worker.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const makePool: <I, E, O>(
  options: Worker.WorkerPool.Options<I, WorkerThreads.Worker>
) => Effect.Effect<Worker.WorkerPool<I, E, O>, never, Worker.WorkerManager | Scope.Scope> = internal.makePool

/**
 * @since 1.0.0
 * @category constructors
 */
export const makePoolLayer: <Tag, I, E, O>(
  tag: Context.Tag<Tag, Worker.WorkerPool<I, E, O>>,
  options: Worker.WorkerPool.Options<I, WorkerThreads.Worker>
) => Layer.Layer<never, never, Tag> = internal.makePoolLayer

/**
 * @since 1.0.0
 * @category constructors
 */
export const makePoolSerialized: <I extends Schema.TaggedRequest.Any>(
  options: Worker.SerializedWorkerPool.Options<I, WorkerThreads.Worker>
) => Effect.Effect<Worker.SerializedWorkerPool<I>, never, Worker.WorkerManager | Scope.Scope> =
  internal.makePoolSerialized

/**
 * @since 1.0.0
 * @category constructors
 */
export const makePoolSerializedLayer: <Tag, I extends Schema.TaggedRequest.Any>(
  tag: Context.Tag<Tag, Worker.SerializedWorkerPool<I>>,
  options: Worker.SerializedWorkerPool.Options<I, WorkerThreads.Worker>
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
