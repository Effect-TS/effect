import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import * as Etag from "../Etag.js"
import * as FileSystem from "../FileSystem.js"
import * as Headers from "../Headers.js"
import type * as Body from "../HttpBody.js"
import type * as Platform from "../HttpPlatform.js"
import type * as ServerResponse from "../HttpServerResponse.js"
import * as serverResponse from "./httpServerResponse.js"

/** @internal */
export const TypeId: Platform.TypeId = Symbol.for("@effect/platform/HttpPlatform") as Platform.TypeId

/** @internal */
export const tag = Context.GenericTag<Platform.HttpPlatform>("@effect/platform/HttpPlatform")

/** @internal */
export const make = (impl: {
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
    options?: FileSystem.StreamOptions
  ) => ServerResponse.HttpServerResponse
}): Effect.Effect<Platform.HttpPlatform, never, FileSystem.FileSystem | Etag.Generator> =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const etagGen = yield* Etag.Generator

    return tag.of({
      [TypeId]: TypeId,
      fileResponse(path, options) {
        return pipe(
          Effect.bindTo(fs.stat(path), "info"),
          Effect.bind("etag", ({ info }) => etagGen.fromFileInfo(info)),
          Effect.map(({ etag, info }) => {
            const start = Number(options?.offset ?? 0)
            const end = options?.bytesToRead !== undefined ? start + Number(options.bytesToRead) : undefined
            const headers = Headers.set(
              options?.headers ? Headers.fromInput(options.headers) : Headers.empty,
              "etag",
              Etag.toString(etag)
            )
            if (info.mtime._tag === "Some") {
              ;(headers as any)["last-modified"] = info.mtime.value.toUTCString()
            }
            const contentLength = end !== undefined ? end - start : Number(info.size) - start
            return impl.fileResponse(
              path,
              options?.status ?? 200,
              options?.statusText,
              headers,
              start,
              end,
              contentLength
            )
          })
        )
      },
      fileWebResponse(file, options) {
        return Effect.map(etagGen.fromFileWeb(file), (etag) => {
          const headers = Headers.merge(
            options?.headers ? Headers.fromInput(options.headers) : Headers.empty,
            Headers.unsafeFromRecord({
              etag: Etag.toString(etag),
              "last-modified": new Date(file.lastModified).toUTCString()
            })
          )
          return impl.fileWebResponse(
            file,
            options?.status ?? 200,
            options?.statusText,
            headers,
            options
          )
        })
      }
    })
  })

/** @internal */
export const layer = Layer.effect(
  tag,
  Effect.flatMap(FileSystem.FileSystem, (fs) =>
    make({
      fileResponse(path, status, statusText, headers, start, end, contentLength) {
        return serverResponse.stream(
          fs.stream(path, {
            offset: start,
            bytesToRead: end !== undefined ? end - start : undefined
          }),
          { contentLength, headers, status, statusText }
        )
      },
      fileWebResponse(file, status, statusText, headers, _options) {
        return serverResponse.stream(
          Stream.fromReadableStream(() => file.stream() as ReadableStream<Uint8Array>, identity),
          { headers, status, statusText }
        )
      }
    }))
).pipe(
  Layer.provide(Etag.layerWeak)
)
