import * as Clock from "effect/Clock"
import * as Effect from "effect/Effect"
import type * as HttpBody from "effect/http/HttpBody"
import * as HttpClientRequest from "effect/http/HttpClientRequest"

/**
 * The credentials a request is signed with.
 *
 * @internal
 */
export interface SigningCredentials {
  readonly accessKeyId: string
  readonly secretAccessKey: string
  readonly sessionToken: string | undefined
}

const encoder = new TextEncoder()

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

const hex = (bytes: Uint8Array): string => {
  let out = ""
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0")
  }
  return out
}

const sha256 = (data: Uint8Array): Effect.Effect<Uint8Array> =>
  Effect.map(
    Effect.promise(() => globalThis.crypto.subtle.digest("SHA-256", toArrayBuffer(data))),
    (digest) => new Uint8Array(digest)
  )

const hmac = (key: Uint8Array, data: string): Effect.Effect<Uint8Array> =>
  Effect.promise(async () => {
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      "raw",
      toArrayBuffer(key),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    return new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", cryptoKey, toArrayBuffer(encoder.encode(data))))
  })

/** Percent-encodes a string per RFC 3986, as SigV4 requires. */
const encodeRfc3986 = (value: string): string =>
  encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

/** `YYYYMMDD'T'HHMMSS'Z'`, the SigV4 timestamp format. */
const formatAmzDate = (date: Date): string => date.toISOString().replace(/[-:]|\.\d{3}/g, "")

/**
 * The bytes of the request body, for the payload hash.
 */
const bodyBytes = (body: HttpBody.HttpBody): Effect.Effect<Uint8Array> => {
  switch (body._tag) {
    case "Empty": {
      return Effect.succeed(new Uint8Array(0))
    }
    case "Uint8Array": {
      return Effect.succeed(body.body)
    }
    case "Raw": {
      if (typeof body.body === "string") {
        return Effect.succeed(encoder.encode(body.body))
      }
      if (body.body instanceof Uint8Array) {
        return Effect.succeed(body.body)
      }
      if (body.body instanceof ArrayBuffer) {
        return Effect.succeed(new Uint8Array(body.body))
      }
      break
    }
  }
  return Effect.die(new Error(`AmazonBedrockClient cannot sign a request with a body of type '${body._tag}'`))
}

/**
 * Signs `request` with AWS Signature Version 4 for the Bedrock Runtime
 * service, adding the `authorization`, `x-amz-date` and, with a session
 * token, `x-amz-security-token` headers.
 *
 * **Details**
 *
 * The signed headers are `host`, `x-amz-date`, `content-type` when present
 * and `x-amz-security-token` when present. Path segments are encoded a second
 * time in the canonical URI, as the service does for every API but S3. The
 * timestamp comes from the Effect `Clock`.
 *
 * @internal
 */
export const sign = (
  request: HttpClientRequest.HttpClientRequest,
  options: {
    readonly region: string
    readonly credentials: SigningCredentials
  }
): Effect.Effect<HttpClientRequest.HttpClientRequest> =>
  Effect.gen(function*() {
    const service = "bedrock"
    const { accessKeyId, secretAccessKey, sessionToken } = options.credentials
    const amzDate = formatAmzDate(new Date(yield* Clock.currentTimeMillis))
    const date = amzDate.slice(0, 8)
    const url = new URL(request.url)

    const headers: Record<string, string> = {
      host: url.host,
      "x-amz-date": amzDate
    }
    const contentType = request.headers["content-type"]
    if (contentType !== undefined) {
      headers["content-type"] = contentType.trim().replace(/\s+/g, " ")
    }
    if (sessionToken !== undefined) {
      headers["x-amz-security-token"] = sessionToken
    }
    const signedHeaderNames = Object.keys(headers).sort()
    const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${headers[name]}\n`).join("")
    const signedHeaders = signedHeaderNames.join(";")

    const canonicalUri = url.pathname.split("/").map(encodeRfc3986).join("/")
    const canonicalQuery = Array.from(url.searchParams.entries())
      .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const)
      .sort(([a, av], [b, bv]) => a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0)
      .map(([key, value]) => `${key}=${value}`)
      .join("&")
    const payloadHash = hex(yield* sha256(yield* bodyBytes(request.body)))

    const canonicalRequest = [
      request.method,
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join("\n")

    const scope = `${date}/${options.region}/${service}/aws4_request`
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      hex(yield* sha256(encoder.encode(canonicalRequest)))
    ].join("\n")

    const kDate = yield* hmac(encoder.encode(`AWS4${secretAccessKey}`), date)
    const kRegion = yield* hmac(kDate, options.region)
    const kService = yield* hmac(kRegion, service)
    const kSigning = yield* hmac(kService, "aws4_request")
    const signature = hex(yield* hmac(kSigning, stringToSign))

    return HttpClientRequest.setHeaders(request, {
      authorization:
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-date": amzDate,
      ...(sessionToken !== undefined ? { "x-amz-security-token": sessionToken } : {})
    })
  })
