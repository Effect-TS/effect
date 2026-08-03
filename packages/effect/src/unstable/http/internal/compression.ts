import { identity } from "../../../Function.ts"
import * as Stream from "../../../Stream.ts"
import * as Headers from "../Headers.ts"
import type { Compression, CompressionAlgorithm, CompressionOptions } from "../HttpPlatform.ts"
import * as Response from "../HttpServerResponse.ts"

/** @internal */
export const varyAcceptEncoding = (headers: Headers.Headers): string | undefined => {
  const vary = headers["vary"]
  if (vary === undefined) {
    return "Accept-Encoding"
  }
  const members = vary.split(",").map((member) => member.trim().toLowerCase())
  return members.includes("*") || members.includes("accept-encoding")
    ? undefined
    : `${vary}, Accept-Encoding`
}

/** @internal */
export const wrapCompression = (impl: Compression): Compression => ({
  algorithms: impl.algorithms,
  compressResponse(response, algorithm, options) {
    const compressed = impl.compressResponse(response, algorithm, options)
    if (compressed === response) {
      return response
    }
    const headers: Record<string, string> = { "content-encoding": algorithm }
    const vary = varyAcceptEncoding(compressed.headers)
    if (vary !== undefined) {
      headers["vary"] = vary
    }
    const etag = compressed.headers["etag"]
    if (etag !== undefined && !etag.startsWith("W/")) {
      headers["etag"] = `W/${etag}`
    }
    return Response.setHeaders(compressed, headers)
  }
})

/** @internal */
export const makeCompression = (options: {
  readonly algorithms: Iterable<CompressionAlgorithm>
  readonly transform: (
    algorithm: CompressionAlgorithm,
    options?: CompressionOptions | undefined
  ) => (stream: ReadableStream<Uint8Array>) => ReadableStream<Uint8Array>
}): Compression => ({
  algorithms: new Set(options.algorithms),
  compressResponse(response, algorithm, opts) {
    const body = response.body
    switch (body._tag) {
      case "Uint8Array": {
        const data = body.body
        return streamBodyResponse(
          response,
          () => options.transform(algorithm, opts)(new Blob([data as BlobPart]).stream() as ReadableStream<Uint8Array>),
          body.contentType
        )
      }
      case "Stream": {
        const stream = body.stream
        return streamBodyResponse(
          response,
          () => options.transform(algorithm, opts)(Stream.toReadableStream(stream)),
          body.contentType
        )
      }
      case "Raw": {
        const readable = rawReadableStream(body.body)
        if (readable === undefined) {
          return response
        }
        return Response.raw(options.transform(algorithm, opts)(readable), {
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
})

const streamBodyResponse = (
  response: Response.HttpServerResponse,
  evaluate: () => ReadableStream<Uint8Array>,
  contentType: string | undefined
): Response.HttpServerResponse =>
  Response.stream(Stream.fromReadableStream({ evaluate, onError: identity }), {
    status: response.status,
    statusText: response.statusText,
    cookies: response.cookies,
    headers: Headers.remove(response.headers, "content-length"),
    contentType
  })

const rawReadableStream = (raw: unknown): ReadableStream<Uint8Array> | undefined => {
  if (typeof ReadableStream !== "undefined" && raw instanceof ReadableStream) {
    return raw
  } else if (raw instanceof globalThis.Response) {
    return raw.body ?? undefined
  }
  return new globalThis.Response(raw as BodyInit).body ?? undefined
}

const webAlgorithms: ReadonlySet<CompressionAlgorithm> = new Set(["gzip", "deflate"])

let webCompression: Compression | undefined

/** @internal */
export const compressionWeb = (): Compression =>
  webCompression ??= makeCompression({
    algorithms: webAlgorithms,
    transform: (algorithm) => (stream) =>
      stream.pipeThrough(
        new CompressionStream(algorithm as "gzip" | "deflate") as unknown as ReadableWritablePair<
          Uint8Array,
          Uint8Array
        >
      )
  })

let webCompressionWithHeaders: Compression | undefined

/** @internal */
export const compressionWebWrapped = (): Compression => webCompressionWithHeaders ??= wrapCompression(compressionWeb())

/** @internal */
export const defaultCompressible = (contentType: string): boolean => {
  const semi = contentType.indexOf(";")
  const type = (semi === -1 ? contentType : contentType.slice(0, semi)).trim().toLowerCase()
  if (type.startsWith("text/")) {
    return true
  }
  switch (type) {
    case "application/json":
    case "application/javascript":
    case "application/xml":
    case "image/svg+xml":
    case "application/wasm": {
      return true
    }
  }
  return type.endsWith("+json") || type.endsWith("+xml")
}

const acceptMember = /^([a-z0-9!#$%&'*+.^_`|~-]+)(?:;q=(0(?:\.[0-9]{0,3})?|1(?:\.0{0,3})?))?$/

/** @internal */
export const parseAcceptEncoding = (header: string): ReadonlyMap<string, number> | undefined => {
  const trimmed = header.trim()
  if (trimmed === "") {
    return undefined
  }
  const accepted = new Map<string, number>()
  for (const part of trimmed.split(",")) {
    const member = part.trim().toLowerCase().replace(/[ \t]*;[ \t]*/g, ";")
    const match = acceptMember.exec(member)
    if (match === null) {
      return undefined
    }
    accepted.set(match[1], match[2] === undefined ? 1 : Number(match[2]))
  }
  return accepted
}

/** @internal */
export const negotiate = (
  header: string | undefined,
  preferred: ReadonlyArray<CompressionAlgorithm>,
  supported: ReadonlySet<CompressionAlgorithm>
): CompressionAlgorithm | undefined => {
  if (header === undefined) {
    return undefined
  }
  const accepted = parseAcceptEncoding(header)
  if (accepted === undefined) {
    return undefined
  }
  for (const algorithm of preferred) {
    if (!supported.has(algorithm)) {
      continue
    }
    const quality = accepted.get(algorithm) ?? accepted.get("*")
    if (quality !== undefined && quality > 0) {
      return algorithm
    }
  }
  return undefined
}
