/**
 * @since 1.0.0
 */
import type * as Context from "@effect/data/Context"
import type * as Effect from "@effect/io/Effect"
import type * as Error from "@effect/platform/Error"
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Body from "@effect/platform/Http/Body"
import type * as Etag from "@effect/platform/Http/Etag"
import type * as ServerResponse from "@effect/platform/Http/ServerResponse"
import * as internal from "@effect/platform/internal/http/platform"

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
      headers: Record<string, string>,
      start: number,
      end: number | undefined,
      contentLength: number
    ) => ServerResponse.ServerResponse
    readonly fileWebResponse: (
      file: Body.Body.FileLike,
      status: number,
      statusText: string | undefined,
      headers: Record<string, string>,
      options?: FileSystem.StreamOptions | undefined
    ) => ServerResponse.ServerResponse
  }
) => Effect.Effect<FileSystem.FileSystem | Etag.Generator, never, Platform> = internal.make
