/**
 * @since 1.0.0
 */
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Multipart from "@effect/platform/Multipart"
import type * as Path from "@effect/platform/Path"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import * as internal from "./internal/multipart.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const stream: (source: Request) => Stream.Stream<Multipart.Part, Multipart.MultipartError> = internal.stream

/**
 * @since 1.0.0
 * @category constructors
 */
export const persisted: (
  source: Request
) => Effect.Effect<Multipart.Persisted, Multipart.MultipartError, FileSystem.FileSystem | Path.Path | Scope.Scope> =
  internal.persisted
