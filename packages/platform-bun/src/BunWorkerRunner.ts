/**
 * @since 1.0.0
 */
import type { WorkerError } from "@effect/platform/WorkerError"
import type * as Runner from "@effect/platform/WorkerRunner"
import type * as Schema from "@effect/schema/Schema"
import type * as Layer from "effect/Layer"
import type * as Stream from "effect/Stream"
import * as internal from "./internal/workerRunner.js"

/**
 * @since 1.0.0
 * @category layers
 */
export const layerPlatform: Layer.Layer<Runner.PlatformRunner> = internal.layerPlatform

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: <I, R, E, O>(
  process: (request: I) => Stream.Stream<O, E, R>,
  options?: Runner.Runner.Options<I, E, O> | undefined
) => Layer.Layer<never, WorkerError, R> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerSerialized: <
  A extends Schema.TaggedRequest.Any,
  I,
  R,
  Handlers extends Runner.SerializedRunner.Handlers<A>
>(
  schema: Schema.Schema<A, I, R>,
  handlers: Handlers
) => Layer.Layer<never, WorkerError, R | Runner.SerializedRunner.HandlersContext<Handlers>> = internal.layerSerialized
