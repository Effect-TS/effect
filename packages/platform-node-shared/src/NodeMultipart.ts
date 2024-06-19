/**
 * @since 1.0.0
 */
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Multipart from "@effect/platform/Multipart"
import type * as Path from "@effect/platform/Path"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import type { IncomingHttpHeaders } from "node:http"
import type { Readable } from "node:stream"
import * as internal from "./internal/multipart.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const stream: (
  source: Readable,
  headers: IncomingHttpHeaders
) => Stream.Stream<Multipart.Part, Multipart.MultipartError> = internal.stream

/**
 * @since 1.0.0
 * @category constructors
 */
export const persisted: (
  source: Readable,
  headers: IncomingHttpHeaders
) => Effect.Effect<
  Multipart.Persisted,
  Multipart.MultipartError,
  FileSystem.FileSystem | Path.Path | Scope.Scope
> = internal.persisted

/**
 * @since 1.0.0
 * @category conversions
 */
export const fileToReadable: (file: Multipart.File) => Readable = internal.fileToReadable
