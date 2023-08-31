/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/Http/ServerResponse`](https://effect-ts.github.io/platform/platform/Http/ServerResponse.ts.html).
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/platform-bun/internal/http/serverResponse"
import type * as PlatformError from "@effect/platform/Error"
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Body from "@effect/platform/Http/Body"
import type * as Etag from "@effect/platform/Http/Etag"
import type * as ServerResponse from "@effect/platform/Http/ServerResponse"

export * from "@effect/platform/Http/ServerResponse"

/**
 * @since 1.0.0
 * @category constructors
 */
export const file: (
  path: string,
  options?: ServerResponse.Options.WithContentType & FileSystem.StreamOptions
) => Effect.Effect<FileSystem.FileSystem | Etag.Generator, PlatformError.PlatformError, ServerResponse.ServerResponse> =
  internal.file

/**
 * @since 1.0.0
 * @category constructors
 */
export const fileWeb: (
  file: Body.Body.FileLike,
  options?: ServerResponse.Options.WithContent
) => Effect.Effect<Etag.Generator, never, ServerResponse.ServerResponse> = internal.fileWeb
