/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/WorkerRunner`](https://effect-ts.github.io/platform/platform/WorkerRunner.ts.html).
 */
import type { WorkerError } from "@effect/platform/WorkerError"
import type * as Runner from "@effect/platform/WorkerRunner"
import type * as Schema from "@effect/schema/Schema"
import type * as Layer from "effect/Layer"
import type * as Stream from "effect/Stream"
import * as internal from "./internal/workerRunner.js"

/**
 * @since 1.0.0
 */
export * from "@effect/platform/WorkerRunner"

/**
 * @since 1.0.0
 * @category layers
 */
export const layerPlatform: Layer.Layer<never, never, Runner.PlatformRunner> = internal.layerPlatform

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: <I, R, E, O>(
  process: (request: I) => Stream.Stream<R, E, O>,
  options?: Runner.Runner.Options<I, E, O> | undefined
) => Layer.Layer<R, WorkerError, never> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerSerialized: <
  I,
  A extends Schema.TaggedRequest.Any,
  Handlers extends Runner.SerializedRunner.Handlers<A>
>(
  schema: Schema.Schema<I, A>,
  handlers: Handlers
) => Layer.Layer<Runner.SerializedRunner.HandlersContext<Handlers>, WorkerError, never> = internal.layerSerialized
