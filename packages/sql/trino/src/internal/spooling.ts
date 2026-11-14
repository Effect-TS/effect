/**
 * The spooling protocol's data plane: turns `{ encoding, segments }` pages
 * into raw rows.
 *
 * Inline segments carry base64 bytes; spooled segments are fetched from their
 * `uri` (a pre-signed object-store URL or a coordinator `/v1/spooled/download`
 * URL that may answer 303) with the segment's opaque `headers`, then
 * acknowledged on `ackUri` so the server can delete the object. Both requests
 * go through the segment client, which retries them (see `http.ts`). A segment is
 * compressed only when its metadata has `uncompressedSize`: the server leaves
 * segments under its compression threshold (8 kB by default) as plain JSON
 * even under `json+zstd`/`json+lz4`.
 */
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import type * as HttpClient from "effect/http/HttpClient"
import type * as HttpClientError from "effect/http/HttpClientError"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Result from "effect/Result"
import * as Stream from "effect/Stream"
import {
  DecodeFailure,
  HttpStatusFailure,
  type Operation,
  type TransportFailure,
  type TrinoFailure,
  Unsupported
} from "./failure.ts"
import { requestFailure } from "./http.ts"
import * as Json from "./json.ts"
import type { Segment } from "./protocol.ts"

const zstdAvailable: boolean = (() => {
  try {
    return new DecompressionStream("zstd" as CompressionFormat) instanceof DecompressionStream
  } catch {
    return false
  }
})()

/**
 * The encodings this runtime can decode, in preference order; feeds
 * `ProtocolConfig.encodings`. `json+zstd` is listed only where the runtime's
 * `DecompressionStream` supports zstd; `json+lz4` uses the block decoder below.
 */
export const supportedEncodings: ReadonlyArray<string> = zstdAvailable
  ? ["json+zstd", "json+lz4", "json"]
  : ["json+lz4", "json"]

/** Segments fetched ahead of the consumer; order is preserved. */
const prefetch = 2

/**
 * Decompresses one LZ4 raw block (no frame header), the format aircompressor's
 * `Lz4Compressor` writes for `json+lz4` segments.
 */
export const decompressLz4 = (input: Uint8Array, uncompressedSize: number): Result.Result<Uint8Array, string> => {
  const output = new Uint8Array(uncompressedSize)
  let ip = 0
  let op = 0
  while (ip < input.length) {
    const token = input[ip++]
    let literals = token >>> 4
    if (literals === 15) {
      let byte: number
      do {
        if (ip >= input.length) return Result.fail("truncated literal length")
        byte = input[ip++]
        literals += byte
      } while (byte === 255)
    }
    if (ip + literals > input.length || op + literals > uncompressedSize) {
      return Result.fail("literal run out of bounds")
    }
    output.set(input.subarray(ip, ip + literals), op)
    ip += literals
    op += literals
    // the last sequence carries literals only
    if (ip === input.length) break
    if (ip + 2 > input.length) return Result.fail("truncated match offset")
    const offset = input[ip] | (input[ip + 1] << 8)
    ip += 2
    if (offset === 0 || offset > op) return Result.fail(`invalid match offset ${offset}`)
    let match = (token & 15) + 4
    if ((token & 15) === 15) {
      let byte: number
      do {
        if (ip >= input.length) return Result.fail("truncated match length")
        byte = input[ip++]
        match += byte
      } while (byte === 255)
    }
    if (op + match > uncompressedSize) return Result.fail("match out of bounds")
    // byte by byte: a match may overlap the bytes it copies
    for (let from = op - offset, end = op + match; op < end;) output[op++] = output[from++]
  }
  return op === uncompressedSize
    ? Result.succeed(output)
    : Result.fail(`decompressed ${op} bytes, expected ${uncompressedSize}`)
}

const decodeFailure = (message: string, cause: unknown) => new DecodeFailure({ message, column: undefined, cause })

const metadataInteger = (segment: Segment, key: string): number | undefined => {
  const value = segment.metadata[key]
  // DataAttribute accepts numbers and numeric strings
  const n = value instanceof Json.JsonNumber ? Number(value.source) : typeof value === "string" ? Number(value) : NaN
  return Number.isSafeInteger(n) ? n : undefined
}

const withSegmentHeaders = (request: HttpClientRequest.HttpClientRequest, segment: Segment) => {
  let out = request
  for (const [name, values] of segment.headers) out = HttpClientRequest.setHeader(out, name, values.join(", "))
  return out
}

/** GETs `uri` with the segment's headers and returns the body bytes. */
const get = (
  http: HttpClient.HttpClient,
  segment: Segment,
  uri: string,
  operation: Operation
): Effect.Effect<Uint8Array, HttpStatusFailure | TransportFailure> =>
  http.execute(withSegmentHeaders(HttpClientRequest.get(uri), segment)).pipe(
    Effect.flatMap((response): Effect.Effect<Uint8Array, HttpStatusFailure | HttpClientError.HttpClientError> => {
      if (response.status >= 200 && response.status < 300) {
        return Effect.map(response.arrayBuffer, (b) => new Uint8Array(b))
      }
      return Effect.flatMap(
        Effect.orElseSucceed(response.text, () => ""),
        (body) => Effect.fail(new HttpStatusFailure({ status: response.status, body, operation }))
      )
    }),
    Effect.catchTag("HttpClientError", (error) => Effect.flatMap(requestFailure(error, operation), Effect.fail))
  )

const zstd = (bytes: Uint8Array) =>
  Effect.tryPromise({
    try: () =>
      new Response(
        new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(
          new DecompressionStream("zstd" as CompressionFormat)
        )
      ).arrayBuffer(),
    catch: (cause) => decodeFailure("zstd decompression failed", cause)
  }).pipe(Effect.map((buffer) => new Uint8Array(buffer)))

const decompress = (encoding: string, segment: Segment, bytes: Uint8Array): Effect.Effect<Uint8Array, TrinoFailure> => {
  const uncompressedSize = metadataInteger(segment, "uncompressedSize")
  if (uncompressedSize === undefined) return Effect.succeed(bytes)
  if (encoding.endsWith("+lz4")) {
    return Effect.mapError(
      Effect.fromResult(decompressLz4(bytes, uncompressedSize)),
      (reason) => decodeFailure(`LZ4 segment is corrupt: ${reason}`, segment)
    )
  }
  if (encoding.endsWith("+zstd") && zstdAvailable) {
    return Effect.flatMap(zstd(bytes), (out) =>
      out.length === uncompressedSize
        ? Effect.succeed(out)
        : Effect.fail(
          decodeFailure(`zstd segment decompressed to ${out.length} bytes, expected ${uncompressedSize}`, segment)
        ))
  }
  return Effect.fail(new Unsupported({ message: `Cannot decode spooled encoding ${encoding}`, operation: "spool" }))
}

const utf8 = new TextDecoder("utf-8", { fatal: true })

const parseRows = (
  segment: Segment,
  bytes: Uint8Array
): Effect.Effect<ReadonlyArray<ReadonlyArray<Json.JsonValue>>, DecodeFailure> =>
  Effect.suspend(() => {
    let text: string
    try {
      text = utf8.decode(bytes)
    } catch (cause) {
      return Effect.fail(decodeFailure("Segment is not valid UTF-8", cause))
    }
    const parsed = Json.parse(text)
    if (Result.isFailure(parsed)) return Effect.fail(decodeFailure("Segment is not valid JSON", parsed.failure))
    const rows = Json.asArray(parsed.success)
    if (rows === undefined || !rows.every(Array.isArray)) {
      return Effect.fail(decodeFailure("Segment is not an array of rows", segment.metadata))
    }
    const expected = metadataInteger(segment, "rowsCount")
    if (expected !== undefined && expected !== rows.length) {
      return Effect.fail(decodeFailure(`Segment has ${rows.length} rows, metadata says ${expected}`, segment.metadata))
    }
    // every element was checked to be an array above
    return Effect.succeed(rows as ReadonlyArray<ReadonlyArray<Json.JsonValue>>)
  })

/** Best effort after retries: the server prunes unacknowledged segments when their TTL expires. */
const acknowledge = (http: HttpClient.HttpClient, segment: Segment, ackUri: string) =>
  Effect.ignore(get(http, segment, ackUri, "ack"))

const load = (http: HttpClient.HttpClient, encoding: string, segment: Segment) => {
  if (segment.type === "inline") {
    if (segment.data === undefined) return Effect.fail(decodeFailure("Inline segment without data", segment.metadata))
    return Effect.fromResult(Base64.decode(segment.data)).pipe(
      Effect.mapError((cause) => decodeFailure("Inline segment is not base64", cause)),
      Effect.flatMap((bytes) => decompress(encoding, segment, bytes)),
      Effect.flatMap((bytes) => parseRows(segment, bytes))
    )
  }
  const { ackUri, uri } = segment
  if (uri === undefined || ackUri === undefined) {
    return Effect.fail(decodeFailure("Spooled segment without uri or ackUri", segment.metadata))
  }
  return get(http, segment, uri, "spool").pipe(
    Effect.flatMap((bytes) => {
      const size = metadataInteger(segment, "segmentSize")
      return size === undefined || size === bytes.length
        ? decompress(encoding, segment, bytes)
        : Effect.fail(
          decodeFailure(`Spooled segment has ${bytes.length} bytes, metadata says ${size}`, segment.metadata)
        )
    }),
    Effect.flatMap((bytes) => parseRows(segment, bytes)),
    Effect.tap(() => acknowledge(http, segment, ackUri))
  )
}

/**
 * Turns one Segments page into raw rows, in segment order: inline segments are
 * base64-decoded; spooled segments are fetched with their headers via `http`,
 * decompressed per encoding, and acknowledged (`ackUri`) after a successful
 * read. Rows are `JsonValue` leaves exactly like direct-protocol rows.
 */
export const resolve = (options: {
  /** The segment client: unauthenticated, with the retry policy. */
  readonly http: HttpClient.HttpClient
  readonly encoding: string
  readonly segments: ReadonlyArray<Segment>
}): Stream.Stream<ReadonlyArray<Json.JsonValue>, TrinoFailure> =>
  options.encoding !== "json" && !options.encoding.startsWith("json+")
    ? Stream.fail(
      new Unsupported({ message: `Cannot decode spooled encoding ${options.encoding}`, operation: "spool" })
    )
    : Stream.fromIterable(options.segments).pipe(
      Stream.mapEffect((segment) => load(options.http, options.encoding, segment), {
        concurrency: prefetch
      }),
      Stream.flattenIterable
    )
