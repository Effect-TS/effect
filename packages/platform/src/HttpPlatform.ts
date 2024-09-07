/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { Layer } from "effect/Layer"
import type * as Error from "./Error.js"
import type * as Etag from "./Etag.js"
import type * as FileSystem from "./FileSystem.js"
import type * as Headers from "./Headers.js"
import type * as Body from "./HttpBody.js"
import type * as ServerResponse from "./HttpServerResponse.js"
import * as internal from "./internal/httpPlatform.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category tags
 */
export const HttpPlatform: Context.Tag<HttpPlatform, HttpPlatform> = internal.tag

/**
 * @since 1.0.0
 * @category models
 */
export interface HttpPlatform {
  readonly [TypeId]: TypeId
  readonly fileResponse: (
    path: string,
    options?: ServerResponse.Options.WithContent & FileSystem.StreamOptions
  ) => Effect.Effect<ServerResponse.HttpServerResponse, Error.PlatformError>
  readonly fileWebResponse: (
    file: Body.HttpBody.FileLike,
    options?: ServerResponse.Options.WithContent & FileSystem.StreamOptions
  ) => Effect.Effect<ServerResponse.HttpServerResponse>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  impl: {
    readonly fileResponse: (
      path: string,
      status: number,
      statusText: string | undefined,
      headers: Headers.Headers,
      start: number,
      end: number | undefined,
      contentLength: number
    ) => ServerResponse.HttpServerResponse
    readonly fileWebResponse: (
      file: Body.HttpBody.FileLike,
      status: number,
      statusText: string | undefined,
      headers: Headers.Headers,
      options?: FileSystem.StreamOptions | undefined
    ) => ServerResponse.HttpServerResponse
  }
) => Effect.Effect<HttpPlatform, never, FileSystem.FileSystem | Etag.Generator> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer<HttpPlatform, never, FileSystem.FileSystem> = internal.layer
