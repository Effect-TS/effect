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
import * as Effect from "effect/Effect"
import type { FileSystem } from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Etag from "effect/unstable/http/Etag"
import * as HttpBody from "effect/unstable/http/HttpBody"
import * as Platform from "effect/unstable/http/HttpPlatform"
import * as Response from "effect/unstable/http/HttpServerResponse"
import * as Zlib from "node:zlib"
import * as BunFileSystem from "./BunFileSystem.ts"

const brotliParams = (level: number | undefined, sizeHint: number): Zlib.BrotliOptions => {
  const params: Record<number, number> = { [Zlib.constants.BROTLI_PARAM_SIZE_HINT]: sizeHint }
  if (level !== undefined) {
    params[Zlib.constants.BROTLI_PARAM_QUALITY] = level
  }
  return { params }
}

const zstdParams = (level: number | undefined): Zlib.ZstdOptions | undefined =>
  level === undefined || level === 3 ? undefined : { params: { [Zlib.constants.ZSTD_c_compressionLevel]: level } }

const compress = (
  data: Uint8Array,
  algorithm: Platform.CompressionAlgorithm,
  options?: Platform.CompressionOptions | undefined
): Effect.Effect<Uint8Array> =>
  Effect.callback((resume) => {
    const complete = (error: Error | null, result: Uint8Array) =>
      resume(error === null ? Effect.succeed(result) : Effect.die(error))
    switch (algorithm) {
      case "gzip": {
        Zlib.gzip(data, { level: options?.level }, complete)
        break
      }
      case "deflate": {
        Zlib.deflate(data, { level: options?.level }, complete)
        break
      }
      case "br": {
        Zlib.brotliCompress(data, brotliParams(options?.level, data.byteLength), complete)
        break
      }
      case "zstd": {
        const params = zstdParams(options?.level)
        if (params === undefined) {
          Zlib.zstdCompress(data, complete)
        } else {
          Zlib.zstdCompress(data, params, complete)
        }
        break
      }
    }
  })

// Bun's CompressionStream supports an extended format set covering brotli and
// zstd
const streamCompression = Platform.makeCompressionWeb({
  algorithms: ["gzip", "deflate", "br", "zstd"],
  transform: (algorithm) => Platform.compressionTransformWeb(algorithm === "br" ? "brotli" : algorithm)
})

const compression: Platform.Compression = {
  algorithms: streamCompression.algorithms,
  compressResponse(response, algorithm, options) {
    const body = response.body
    if (body._tag !== "Uint8Array") {
      return streamCompression.compressResponse(response, algorithm, options)
    }
    return Effect.map(compress(body.body, algorithm, options), (result) =>
      Response.setHeader(
        Response.setBody(response, HttpBody.uint8Array(result, body.contentType)),
        "content-length",
        result.byteLength.toString()
      ))
  }
}

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
  fileResponse(path, status, statusText, headers, start, end, _contentLength) {
    let file = Bun.file(path)
    if (start > 0 || end !== undefined) {
      file = file.slice(start, end)
    }
    return Response.raw(file, { headers, status, statusText })
  },
  fileWebResponse(file, status, statusText, headers, _options) {
    return Response.raw(file, { headers, status, statusText })
  }
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
