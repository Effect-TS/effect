/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/Http/Multipart`](https://effect-ts.github.io/platform/platform/Http/Multipart.ts.html).
 */
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Multipart from "@effect/platform/Http/Multipart"
import type * as Path from "@effect/platform/Path"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import type { IncomingHttpHeaders } from "node:http"
import type { Readable } from "node:stream"
import * as internal from "../internal/http/multipart.js"

/**
 * @since 1.0.0
 */
export * from "@effect/platform/Http/Multipart"

/**
 * @since 1.0.0
 * @category constructors
 */
export const stream: (
  source: Readable,
  headers: IncomingHttpHeaders
) => Stream.Stream<never, Multipart.MultipartError, Multipart.Part> = internal.stream

/**
 * @since 1.0.0
 * @category constructors
 */
export const persisted: (
  source: Readable,
  headers: IncomingHttpHeaders
) => Effect.Effect<
  FileSystem.FileSystem | Path.Path | Scope.Scope,
  Multipart.MultipartError,
  Multipart.Persisted
> = internal.persisted

/**
 * @since 1.0.0
 * @category conversions
 */
export const fileToReadable: (file: Multipart.File) => Readable = internal.fileToReadable
