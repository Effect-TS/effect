/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Error from "../Error.js"
import type * as FileSystem from "../FileSystem.js"
import * as internal from "../internal/http/platform.js"
import type * as Body from "./Body.js"
import type * as Etag from "./Etag.js"
import type * as Headers from "./Headers.js"
import type * as ServerResponse from "./ServerResponse.js"

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
export const Platform: Context.Tag<Platform, Platform> = internal.tag

/**
 * @since 1.0.0
 * @category models
 */
export interface Platform {
  readonly [TypeId]: TypeId
  readonly fileResponse: (
    path: string,
    options?: ServerResponse.Options.WithContent & FileSystem.StreamOptions
  ) => Effect.Effect<never, Error.PlatformError, ServerResponse.ServerResponse>
  readonly fileWebResponse: (
    file: Body.Body.FileLike,
    options?: ServerResponse.Options.WithContent & FileSystem.StreamOptions
  ) => Effect.Effect<never, never, ServerResponse.ServerResponse>
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
    ) => ServerResponse.ServerResponse
    readonly fileWebResponse: (
      file: Body.Body.FileLike,
      status: number,
      statusText: string | undefined,
      headers: Headers.Headers,
      options?: FileSystem.StreamOptions | undefined
    ) => ServerResponse.ServerResponse
  }
) => Effect.Effect<FileSystem.FileSystem | Etag.Generator, never, Platform> = internal.make
