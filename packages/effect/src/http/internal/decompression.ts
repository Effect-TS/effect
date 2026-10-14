import * as ByteSize from "../../ByteSize.ts"
import * as Effect from "../../Effect.ts"
import type * as FileSystem from "../../FileSystem.ts"
import * as Inspectable from "../../Inspectable.ts"
import type * as Option from "../../Option.ts"
import type * as Path from "../../Path.ts"
import type { ReadonlyRecord } from "../../Record.ts"
import type * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import type * as Socket from "../../socket/Socket.ts"
import * as Stream from "../../Stream.ts"
import * as Headers from "../Headers.ts"
import * as HttpIncomingMessage from "../HttpIncomingMessage.ts"
import type { HttpMethod } from "../HttpMethod.ts"
import { HttpServerError, RequestParseError } from "../HttpServerError.ts"
import * as HttpServerRequest from "../HttpServerRequest.ts"
import * as Multipart from "../Multipart.ts"
import * as UrlParams from "../UrlParams.ts"

/**
 * @internal
 */
export type Coding = "gzip" | "deflate"

/**
 * @internal
 */
export const defaultMaxDecompressedSize = ByteSize.mebibytes(10)

/**
 * Parses a `Content-Encoding` header into the codings to undo, in the order
 * they were applied. `identity` members are dropped. Returns `undefined` if
 * any member is unsupported.
 *
 * @internal
 */
export const parseContentEncoding = (header: string): ReadonlyArray<Coding> | undefined => {
  const codings: Array<Coding> = []
  for (const member of header.split(",")) {
    const coding = member.trim().toLowerCase()
    if (coding === "" || coding === "identity") continue
    if (coding !== "gzip" && coding !== "deflate") return undefined
    codings.push(coding)
  }
  return codings
}

/**
 * Wraps a request so that its body accessors yield the decompressed body.
 * Decompression happens lazily, when a body accessor is read.
 *
 * @internal
 */
export class DecompressedRequest extends Inspectable.Class implements HttpServerRequest.HttpServerRequest {
  readonly [HttpServerRequest.TypeId]: typeof HttpServerRequest.TypeId
  readonly [HttpIncomingMessage.TypeId]: typeof HttpIncomingMessage.TypeId
  readonly inner: HttpServerRequest.HttpServerRequest
  readonly codings: ReadonlyArray<Coding>
  readonly maxDecompressedSize: ByteSize.ByteSize | undefined

  constructor(
    inner: HttpServerRequest.HttpServerRequest,
    codings: ReadonlyArray<Coding>,
    maxDecompressedSize: ByteSize.ByteSize | undefined
  ) {
    super()
    this[HttpServerRequest.TypeId] = HttpServerRequest.TypeId
    this[HttpIncomingMessage.TypeId] = HttpIncomingMessage.TypeId
    this.inner = inner
    this.codings = codings
    this.maxDecompressedSize = maxDecompressedSize
  }

  toJSON(): unknown {
    return HttpIncomingMessage.inspect(this, {
      _id: "HttpServerRequest",
      method: this.method,
      url: this.originalUrl
    })
  }

  modify(
    options: {
      readonly url?: string
      readonly headers?: Headers.Headers
      readonly remoteAddress?: Option.Option<string>
    }
  ): HttpServerRequest.HttpServerRequest {
    return new DecompressedRequest(this.inner.modify(options), this.codings, this.maxDecompressedSize)
  }

  get source(): object {
    return this.inner.source
  }

  get url(): string {
    return this.inner.url
  }

  get originalUrl(): string {
    return this.inner.originalUrl
  }

  get method(): HttpMethod {
    return this.inner.method
  }

  get cookies(): ReadonlyRecord<string, string> {
    return this.inner.cookies
  }

  get remoteAddress(): Option.Option<string> {
    return this.inner.remoteAddress
  }

  get upgrade(): Effect.Effect<Socket.Socket, HttpServerError> {
    return this.inner.upgrade
  }

  private cachedHeaders: Headers.Headers | undefined
  get headers(): Headers.Headers {
    return this.cachedHeaders ??= Headers.removeMany(this.inner.headers, ["content-encoding", "content-length"])
  }

  get stream(): Stream.Stream<Uint8Array, HttpServerError> {
    return Stream.unwrap(Effect.withFiber((fiber) => {
      const limit = this.maxDecompressedSize ?? fiber.getRef(HttpIncomingMessage.MaxBodySize) ??
        defaultMaxDecompressedSize
      const maxBytes = Number(limit)
      const exceeded = () => this.parseError(`Decompressed request body exceeds the limit of ${limit} bytes`)
      return Effect.succeed(Stream.fromReadableStream({
        evaluate: () => {
          let body = Stream.toReadableStreamWith(this.inner.stream, fiber.context)
          for (let i = this.codings.length - 1; i >= 0; i--) {
            body = body.pipeThrough(
              new DecompressionStream(this.codings[i]) as unknown as ReadableWritablePair<Uint8Array, Uint8Array>
            )
          }
          let size = 0
          return body.pipeThrough(
            new TransformStream<Uint8Array, Uint8Array>({
              transform(chunk, controller) {
                size += chunk.byteLength
                if (size > maxBytes) {
                  controller.error(exceeded())
                } else {
                  controller.enqueue(chunk)
                }
              }
            })
          )
        },
        onError: (cause) => cause instanceof HttpServerError ? cause : this.parseError(undefined, cause)
      }))
    }))
  }

  private bytesEffect: Effect.Effect<Uint8Array, HttpServerError> | undefined
  private get bytes(): Effect.Effect<Uint8Array, HttpServerError> {
    return this.bytesEffect ??= Effect.runSync(Effect.cached(Stream.mkUint8Array(this.stream)))
  }

  get text(): Effect.Effect<string, HttpServerError> {
    return Effect.map(this.bytes, (bytes) => textDecoder.decode(bytes))
  }

  get json(): Effect.Effect<Schema.Json, HttpServerError> {
    return Effect.flatMap(this.text, (text) =>
      Effect.try({
        try: () => text === "" ? null : JSON.parse(text) as Schema.Json,
        catch: (cause) => this.parseError(undefined, cause)
      }))
  }

  get urlParamsBody(): Effect.Effect<UrlParams.UrlParams, HttpServerError> {
    return Effect.flatMap(this.text, (text) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(text)),
        catch: (cause) => this.parseError(undefined, cause)
      }))
  }

  get arrayBuffer(): Effect.Effect<ArrayBuffer, HttpServerError> {
    return Effect.map(
      this.bytes,
      (bytes) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    )
  }

  get multipartStream(): Stream.Stream<Multipart.Part, Multipart.MultipartError> {
    return Stream.pipeThroughChannel(
      Stream.mapError(this.stream, (cause) => Multipart.MultipartError.fromReason("InternalError", cause)),
      Multipart.makeChannel(this.headers)
    )
  }

  private multipartEffect:
    | Effect.Effect<Multipart.Persisted, Multipart.MultipartError, Scope.Scope | FileSystem.FileSystem | Path.Path>
    | undefined
  get multipart(): Effect.Effect<
    Multipart.Persisted,
    Multipart.MultipartError,
    Scope.Scope | FileSystem.FileSystem | Path.Path
  > {
    return this.multipartEffect ??= Effect.runSync(Effect.cached(Multipart.toPersisted(this.multipartStream)))
  }

  private parseError(description?: string, cause?: unknown): HttpServerError {
    return new HttpServerError({
      reason: new RequestParseError({
        request: this,
        ...(description === undefined ? undefined : { description }),
        ...(cause === undefined ? undefined : { cause })
      })
    })
  }
}

const textDecoder = new TextDecoder()
