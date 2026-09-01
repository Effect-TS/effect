/**
 * Bun implementation of the Effect HTTP platform service.
 *
 * This module provides one `layer` for `HttpPlatform`. It implements file
 * responses with `Bun.file`, supports sliced file responses for byte ranges,
 * and returns Web `File` values as raw HTTP server responses. The layer also
 * provides the Bun file-system layer and ETag generator required by
 * `HttpPlatform`.
 *
 * @since 4.0.0
 */
import * as NodeHttpCompression from "@effect/platform-node-shared/NodeHttpCompression"
import * as ByteSize from "effect/ByteSize"
import * as Effect from "effect/Effect"
import type { FileSystem } from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PlatformError from "effect/PlatformError"
import * as Etag from "effect/unstable/http/Etag"
import * as Platform from "effect/unstable/http/HttpPlatform"
import * as Response from "effect/unstable/http/HttpServerResponse"
import * as BunFileSystem from "./BunFileSystem.ts"

// Bun's CompressionStream supports an extended format set covering brotli and
// zstd
const compression = NodeHttpCompression.make(Platform.makeCompressionWeb({
  algorithms: ["gzip", "deflate", "br", "zstd"],
  transform: (algorithm) => Platform.compressionTransformWeb(algorithm === "br" ? "brotli" : algorithm)
}))

/**
 * @category constructors
 * @since 4.0.0
 */
const make: Effect.Effect<
  Platform.HttpPlatform["Service"],
  never,
  FileSystem | Etag.Generator
> = Platform.make({
  platform: "bun",
  compression,
  fileResponse(path, status, statusText, headers, start, end, contentLength) {
    return Effect.gen(function*() {
      if (ByteSize.isZero(contentLength)) {
        return Response.raw(new Uint8Array(0), { headers, status, statusText })
      }
      let file = Bun.file(path)
      if (!ByteSize.isZero(start) || end !== undefined) {
        file = file.slice(
          yield* byteSizeToNumber(start),
          end === undefined ? undefined : yield* byteSizeToNumber(end)
        )
      }
      return Response.raw(file, { headers, status, statusText })
    })
  },
  fileWebResponse(file, status, statusText, headers, options) {
    const start = Math.min(Math.max(options?.offset ?? 0, 0), file.size)
    const end = options?.bytesToRead === undefined
      ? undefined
      : Math.min(start + Math.max(options.bytesToRead, 0), file.size)
    const body = start > 0 || end !== undefined
      ? (file as File).slice(start, end, file.type)
      : file
    return Response.raw(body, { headers, status, statusText })
  }
})

const byteSizeToNumber = (size: ByteSize.ByteSize) =>
  Option.match(ByteSize.toNumber(size), {
    onNone: () =>
      Effect.fail(PlatformError.badArgument({
        module: "HttpPlatform",
        method: "fileResponse",
        description: "file range exceeds Number.MAX_SAFE_INTEGER"
      })),
    onSome: Effect.succeed
  })

/**
 * Layer that provides the Bun `HttpPlatform`, including file responses backed by `Bun.file`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = Layer.effect(Platform.HttpPlatform)(make).pipe(
  Layer.provide(BunFileSystem.layer),
  Layer.provide(Etag.layer)
)
