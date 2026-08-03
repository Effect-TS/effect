/**
 * Deno implementation of the Effect HTTP platform service.
 *
 * File responses use `Deno.FsFile.readable` directly so full-file responses
 * retain Deno's resource-backed fast path. Deno closes the file after the body
 * is sent, but server adapters must cancel a raw body when they do not send it,
 * including when handling `HEAD` requests.
 *
 * The provided layer uses strong ETags, unlike the portable `HttpPlatform`
 * layer, which uses weak ETags.
 *
 * @since 4.0.0
 */
import { contentType } from "@std/media-types"
import { extname } from "@std/path"
import { ByteSliceStream } from "@std/streams"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Etag from "effect/unstable/http/Etag"
import * as HttpBody from "effect/unstable/http/HttpBody"
import * as Platform from "effect/unstable/http/HttpPlatform"
import * as Response from "effect/unstable/http/HttpServerResponse"
import { Readable } from "node:stream"
import * as Zlib from "node:zlib"
import * as DenoFileSystem from "./DenoFileSystem.ts"

const compressionAlgorithms: Array<Platform.CompressionAlgorithm> = ["gzip", "deflate", "br"]
if (typeof Zlib.zstdCompress === "function") {
  compressionAlgorithms.push("zstd")
}

const brotliParams = (level: number | undefined, sizeHint?: number): Zlib.BrotliOptions => {
  const params: Record<number, number> = {}
  if (level !== undefined) {
    params[Zlib.constants.BROTLI_PARAM_QUALITY] = level
  }
  if (sizeHint !== undefined) {
    params[Zlib.constants.BROTLI_PARAM_SIZE_HINT] = sizeHint
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

// gzip and deflate use the native CompressionStream, which does not expose a
// per-chunk flush control. br and zstd go through node:zlib compatibility
// streams and flush each input chunk.
const streamCompression = Platform.makeCompressionWeb({
  algorithms: compressionAlgorithms,
  transform: (algorithm, options) => {
    switch (algorithm) {
      case "gzip":
      case "deflate": {
        return Platform.compressionTransformWeb(algorithm)
      }
      case "br":
      case "zstd": {
        return (stream) => {
          const transform = algorithm === "br"
            ? Zlib.createBrotliCompress({
              ...brotliParams(options?.level),
              flush: Zlib.constants.BROTLI_OPERATION_FLUSH
            })
            : Zlib.createZstdCompress({
              ...zstdParams(options?.level),
              flush: Zlib.constants.ZSTD_e_flush
            })
          const source = Readable.fromWeb(stream as any)
          source.on("error", (cause) => transform.destroy(cause))
          transform.on("close", () => source.destroy())
          return Readable.toWeb(source.pipe(transform)) as ReadableStream<Uint8Array>
        }
      }
    }
  }
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
 * Creates the Deno `HttpPlatform`, serving file responses from resource-backed
 * readable streams and adding content type and content length headers.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Platform.make({
  platform: "deno",
  compression,
  fileResponse(path, status, statusText, headers, start, end, contentLength) {
    let body: ReadableStream<Uint8Array>
    if (contentLength === 0) {
      body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close()
        }
      })
    } else {
      const file = Deno.openSync(path)
      file.seekSync(start, Deno.SeekMode.Start)
      body = end === undefined
        ? file.readable
        : file.readable.pipeThrough(new ByteSliceStream(0, contentLength - 1))
    }
    return Response.raw(body, {
      headers: {
        ...headers,
        "content-type": headers["content-type"] ?? contentType(extname(path)) ?? "application/octet-stream",
        "content-length": contentLength.toString()
      },
      status,
      statusText
    })
  },
  fileWebResponse(file, status, statusText, headers, _options) {
    return Response.raw(file, {
      headers: {
        ...headers,
        "content-type": file.type,
        "content-length": file.size.toString()
      },
      status,
      statusText
    })
  }
})

/**
 * Provides the Deno `HttpPlatform` together with its filesystem and strong ETag
 * services.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Platform.HttpPlatform> = Layer.effect(Platform.HttpPlatform)(make).pipe(
  Layer.provide(DenoFileSystem.layer),
  Layer.provide(Etag.layer)
)
