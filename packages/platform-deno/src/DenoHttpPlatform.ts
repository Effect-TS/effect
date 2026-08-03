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
import * as Layer from "effect/Layer"
import * as Etag from "effect/unstable/http/Etag"
import * as Platform from "effect/unstable/http/HttpPlatform"
import * as Response from "effect/unstable/http/HttpServerResponse"
import { Readable } from "node:stream"
import * as Zlib from "node:zlib"
import * as DenoFileSystem from "./DenoFileSystem.ts"

const compressionAlgorithms: Array<Platform.CompressionAlgorithm> = ["gzip", "deflate", "br"]
if (typeof Zlib.zstdCompressSync === "function") {
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

const zstdParams = (level: number | undefined): Zlib.ZstdOptions =>
  level === undefined ? {} : { params: { [Zlib.constants.ZSTD_c_compressionLevel]: level } }

// gzip and deflate use the native CompressionStream; br and zstd go through
// the node:zlib compatibility streams
const compression = Platform.makeCompression({
  algorithms: compressionAlgorithms,
  transform: (algorithm, options) => (stream) => {
    switch (algorithm) {
      case "gzip":
      case "deflate": {
        return stream.pipeThrough(
          new CompressionStream(algorithm) as unknown as ReadableWritablePair<Uint8Array, Uint8Array>
        )
      }
      case "br":
      case "zstd": {
        const transform = algorithm === "br"
          ? Zlib.createBrotliCompress({
            ...brotliParams(options?.level),
            flush: Zlib.constants.BROTLI_OPERATION_FLUSH
          })
          : Zlib.createZstdCompress(zstdParams(options?.level))
        const source = Readable.fromWeb(stream as any)
        source.on("error", (cause) => transform.destroy(cause))
        return Readable.toWeb(source.pipe(transform)) as ReadableStream<Uint8Array>
      }
    }
  },
  compressSync: (data, algorithm, options) => {
    switch (algorithm) {
      case "gzip": {
        return Zlib.gzipSync(data, { level: options?.level })
      }
      case "deflate": {
        return Zlib.deflateSync(data, { level: options?.level })
      }
      case "br": {
        return Zlib.brotliCompressSync(data, brotliParams(options?.level, data.length))
      }
      case "zstd": {
        return Zlib.zstdCompressSync(data, zstdParams(options?.level))
      }
    }
  }
})

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
