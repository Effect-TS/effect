/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/Http/FormData`](https://effect-ts.github.io/platform/platform/Http/FormData.ts.html).
 */
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as FormData from "@effect/platform/Http/FormData"
import type * as Path from "@effect/platform/Path"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import type { IncomingHttpHeaders } from "node:http"
import type { Readable } from "node:stream"
import * as internal from "../internal/http/formData.js"

/**
 * @since 1.0.0
 */
export * from "@effect/platform/Http/FormData"

/**
 * @since 1.0.0
 * @category constructors
 */
export const stream: (
  source: Readable,
  headers: IncomingHttpHeaders
) => Stream.Stream<never, FormData.FormDataError, FormData.Part> = internal.stream

/**
 * @since 1.0.0
 * @category constructors
 */
export const formData: (
  source: Readable,
  headers: IncomingHttpHeaders
) => Effect.Effect<
  FileSystem.FileSystem | Path.Path | Scope.Scope,
  FormData.FormDataError,
  FormData.PersistedFormData
> = internal.formData

/**
 * @since 1.0.0
 * @category conversions
 */
export const fileToReadable: (file: FormData.File) => Readable = internal.fileToReadable
