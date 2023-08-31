import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type * as PlatformError from "@effect/platform/Error"
import * as FileSystem from "@effect/platform/FileSystem"
import type * as Body from "@effect/platform/Http/Body"
import * as Etag from "@effect/platform/Http/Etag"
import * as ServerResponse from "@effect/platform/Http/ServerResponse"

/** @internal */
export const file = (
  path: string,
  options?: ServerResponse.Options.WithContentType & FileSystem.StreamOptions
): Effect.Effect<FileSystem.FileSystem | Etag.Generator, PlatformError.PlatformError, ServerResponse.ServerResponse> =>
  pipe(
    Effect.bindTo(Effect.flatMap(FileSystem.FileSystem, (fs) => fs.stat(path)), "info"),
    Effect.bind("etag", ({ info }) =>
      Effect.flatMap(
        Etag.Generator,
        (generator) => generator.fromFileInfo(info)
      )),
    Effect.map(({ etag, info }) => {
      const headers: Record<string, string> = {
        ...(options?.headers ?? {}),
        etag: Etag.toString(etag)
      }
      if (info.mtime._tag === "Some") {
        headers["last-modified"] = info.mtime.value.toUTCString()
      }
      let file = Bun.file(path)
      if (options?.bytesToRead !== undefined || options?.offset !== undefined) {
        const start = Number(options?.offset ?? 0)
        const end = options?.bytesToRead !== undefined ? start + Number(options.bytesToRead) : undefined
        file = file.slice(start, end)
      }
      return ServerResponse.raw(file, { ...options, headers })
    })
  )

/** @internal */
export const fileWeb = (
  file: Body.Body.FileLike,
  options?: ServerResponse.Options.WithContent
): Effect.Effect<Etag.Generator, never, ServerResponse.ServerResponse> =>
  Effect.flatMap(Etag.Generator, (generator) =>
    Effect.map(generator.fromFileWeb(file), (etag) => {
      const headers: Record<string, string> = {
        ...(options?.headers ?? {}),
        etag: Etag.toString(etag),
        "last-modified": new Date(file.lastModified).toUTCString()
      }
      return ServerResponse.raw(file, { ...options, headers })
    }))
