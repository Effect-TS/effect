/**
 * Node.js implementation of the Effect HTTP platform service.
 *
 * This module connects the portable `HttpPlatform` file response helpers to
 * Node runtime primitives. It serves local files through Node readable streams,
 * supports byte ranges, converts Web `File` values to readable streams, and
 * fills in content type and content length headers when needed.
 *
 * @since 4.0.0
 */
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as EtagImpl from "effect/unstable/http/Etag"
import * as Headers from "effect/unstable/http/Headers"
import * as HttpBody from "effect/unstable/http/HttpBody"
import * as Platform from "effect/unstable/http/HttpPlatform"
import * as ServerResponse from "effect/unstable/http/HttpServerResponse"
import * as Fs from "node:fs"
import type { Duplex } from "node:stream"
import { Readable } from "node:stream"
import * as Zlib from "node:zlib"
import Mime from "./Mime.ts"
import * as NodeFileSystem from "./NodeFileSystem.ts"
import * as NodeStream from "./NodeStream.ts"

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

const compressSync = (
  data: Uint8Array,
  algorithm: Platform.CompressionAlgorithm,
  options?: Platform.CompressionOptions | undefined
): Uint8Array => {
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

const compressTransform = (
  algorithm: Platform.CompressionAlgorithm,
  options?: Platform.CompressionOptions | undefined
): Duplex => {
  switch (algorithm) {
    case "gzip": {
      return Zlib.createGzip({ level: options?.level, flush: Zlib.constants.Z_SYNC_FLUSH })
    }
    case "deflate": {
      return Zlib.createDeflate({ level: options?.level, flush: Zlib.constants.Z_SYNC_FLUSH })
    }
    case "br": {
      return Zlib.createBrotliCompress({
        ...brotliParams(options?.level),
        flush: Zlib.constants.BROTLI_OPERATION_FLUSH
      })
    }
    case "zstd": {
      return Zlib.createZstdCompress(zstdParams(options?.level))
    }
  }
}

const compression: Platform.Compression = {
  algorithms: new Set(compressionAlgorithms),
  compressResponse(response, algorithm, options) {
    const body = response.body
    switch (body._tag) {
      case "Uint8Array": {
        return ServerResponse.setBody(
          response,
          HttpBody.uint8Array(compressSync(body.body, algorithm, options), body.contentType)
        )
      }
      case "Stream": {
        return ServerResponse.stream(
          NodeStream.pipeThroughDuplex(body.stream, {
            evaluate: () => compressTransform(algorithm, options)
          }),
          {
            status: response.status,
            statusText: response.statusText,
            cookies: response.cookies,
            headers: Headers.remove(response.headers, "content-length"),
            contentType: body.contentType
          }
        )
      }
      case "Raw": {
        const readable = body.body instanceof Readable
          ? body.body
          : Readable.fromWeb(new Response(body.body as BodyInit).body as any)
        const transform = compressTransform(algorithm, options)
        readable.on("error", (cause) => transform.destroy(cause))
        return ServerResponse.raw(readable.pipe(transform), {
          status: response.status,
          statusText: response.statusText,
          cookies: response.cookies,
          headers: Headers.remove(response.headers, "content-length"),
          contentType: body.contentType ?? response.headers["content-type"]
        })
      }
      default: {
        return response
      }
    }
  }
}

/**
 * Creates the Node `HttpPlatform`, serving file responses from Node readable
 * streams and adding MIME type and content-length headers when needed.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Platform.make({
  platform: "node",
  compression,
  fileResponse(path, status, statusText, headers, start, end, contentLength) {
    const stream = contentLength === 0
      ? Readable.from([])
      : Fs.createReadStream(path, { start, end: end === undefined ? undefined : end - 1 })
    return ServerResponse.raw(stream, {
      headers: {
        ...headers,
        "content-type": headers["content-type"] ?? Mime.getType(path) ?? "application/octet-stream",
        "content-length": contentLength.toString()
      },
      status,
      statusText
    })
  },
  fileWebResponse(file, status, statusText, headers, _options) {
    return ServerResponse.raw(Readable.fromWeb(file.stream() as any), {
      headers: Headers.merge(
        headers,
        Headers.fromRecordUnsafe({
          "content-type": headers["content-type"] ?? Mime.getType(file.name) ?? "application/octet-stream",
          "content-length": file.size.toString()
        })
      ),
      status,
      statusText
    })
  }
})

/**
 * Provides the Node `HttpPlatform` together with the filesystem and ETag
 * services it needs for file responses.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Platform.HttpPlatform> = pipe(
  Layer.effect(Platform.HttpPlatform)(make),
  Layer.provide(NodeFileSystem.layer),
  Layer.provide(EtagImpl.layer)
)
