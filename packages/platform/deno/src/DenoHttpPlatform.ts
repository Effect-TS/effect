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
import * as NodeHttpCompression from "@effect/platform-node-shared/NodeHttpCompression"
import { contentType } from "@std/media-types"
import { extname } from "@std/path"
import * as BI from "effect/BigInt"
import * as ByteSize from "effect/ByteSize"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Etag from "effect/unstable/http/Etag"
import * as Platform from "effect/unstable/http/HttpPlatform"
import * as Response from "effect/unstable/http/HttpServerResponse"
import * as DenoFileSystem from "./DenoFileSystem.ts"
import { handleError } from "./internal/error.ts"

// gzip and deflate use the native CompressionStream, which does not expose a
// per-chunk flush control. br and zstd go through node:zlib compatibility
// streams and flush each input chunk.
const compression = NodeHttpCompression.make(Platform.makeCompressionWeb({
  algorithms: NodeHttpCompression.algorithms,
  transform: (algorithm, options) =>
    algorithm === "gzip" || algorithm === "deflate"
      ? Platform.compressionTransformWeb(algorithm)
      : NodeHttpCompression.compressTransformWeb(algorithm, options)
}))

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
    if (ByteSize.isZero(contentLength)) {
      return Effect.succeed(Response.raw(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.close()
          }
        }),
        {
          headers: responseHeaders(path, headers, contentLength),
          status,
          statusText
        }
      ))
    }
    return Effect.map(
      Effect.try({
        try: () => {
          const file = Deno.openSync(path)
          try {
            file.seekSync(ByteSize.toBigInt(start), Deno.SeekMode.Start)
          } catch (cause) {
            file.close()
            throw cause
          }
          return file
        },
        catch: handleError("HttpPlatform", "fileResponse", path)
      }),
      (file) => {
        const body = end === undefined
          ? file.readable
          : file.readable.pipeThrough(sliceStream(BigInt(0), ByteSize.toBigInt(contentLength)))
        return Response.raw(body, {
          headers: responseHeaders(path, headers, contentLength),
          status,
          statusText
        })
      }
    )
  },
  fileWebResponse(file, status, statusText, headers, options) {
    const offset = Math.min(Math.max(options?.offset ?? 0, 0), file.size)
    const available = file.size - offset
    const contentLength = options?.bytesToRead === undefined
      ? available
      : Math.min(available, Math.max(options.bytesToRead, 0))
    let body: typeof file | ReadableStream<Uint8Array> = file
    if (contentLength === 0) {
      body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close()
        }
      })
    } else if (offset > 0 || options?.bytesToRead !== undefined) {
      body = (file.stream() as ReadableStream<Uint8Array>).pipeThrough(
        sliceStream(BigInt(offset), BigInt(contentLength))
      )
    }
    return Response.raw(body, {
      headers: {
        ...headers,
        "content-type": file.type,
        "content-length": contentLength.toString()
      },
      status,
      statusText
    })
  }
})

const responseHeaders = (path: string, headers: Record<string, string>, contentLength: ByteSize.ByteSize) => ({
  ...headers,
  "content-type": headers["content-type"] ?? contentType(extname(path)) ?? "application/octet-stream",
  "content-length": ByteSize.toBigInt(contentLength).toString()
})

const sliceStream = (start: bigint, length: bigint): TransformStream<Uint8Array, Uint8Array> => {
  let position = BigInt(0)
  let remaining = length
  return new TransformStream({
    transform(chunk, controller) {
      const chunkStart = position
      const chunkEnd = chunkStart + BigInt(chunk.length)
      position = chunkEnd
      if (chunkEnd <= start) {
        return
      }
      const offset = Number(BI.max(start - chunkStart, BigInt(0)))
      const size = Number(BI.min(BigInt(chunk.length - offset), remaining))
      if (size > 0) {
        controller.enqueue(chunk.subarray(offset, offset + size))
        remaining -= BigInt(size)
      }
      if (remaining === BigInt(0)) {
        controller.terminate()
      }
    }
  })
}

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
