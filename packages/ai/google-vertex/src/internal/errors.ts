import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Number from "effect/Number"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Redactable from "effect/Redactable"
import * as Schema from "effect/Schema"
import * as AiError from "effect/unstable/ai/AiError"
import type * as Response from "effect/unstable/ai/Response"
import type * as HttpClientError from "effect/unstable/http/HttpClientError"
import type * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import type * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import type { GoogleVertexErrorMetadata } from "../GoogleVertexError.ts"
import { ErrorResponse } from "./schemas.ts"

// =============================================================================
// Error Mappers
// =============================================================================

/** @internal */
export const mapSchemaError = dual<
  (method: string) => (error: Schema.SchemaError) => AiError.AiError,
  (error: Schema.SchemaError, method: string) => AiError.AiError
>(2, (error, method) =>
  AiError.make({
    module: "GoogleVertexClient",
    method,
    reason: AiError.InvalidOutputError.fromSchemaError(error)
  }))

/** @internal */
export const mapHttpClientError = dual<
  (method: string) => (error: HttpClientError.HttpClientError) => Effect.Effect<never, AiError.AiError>,
  (error: HttpClientError.HttpClientError, method: string) => Effect.Effect<never, AiError.AiError>
>(2, (error, method) => {
  const reason = error.reason
  switch (reason._tag) {
    case "TransportError":
      return Effect.fail(AiError.make({
        module: "GoogleVertexClient",
        method,
        reason: new AiError.NetworkError({
          reason: "TransportError",
          description: reason.description,
          request: buildHttpRequestDetails(reason.request)
        })
      }))
    case "EncodeError":
      return Effect.fail(AiError.make({
        module: "GoogleVertexClient",
        method,
        reason: new AiError.NetworkError({
          reason: "EncodeError",
          description: reason.description,
          request: buildHttpRequestDetails(reason.request)
        })
      }))
    case "InvalidUrlError":
      return Effect.fail(AiError.make({
        module: "GoogleVertexClient",
        method,
        reason: new AiError.NetworkError({
          reason: "InvalidUrlError",
          description: reason.description,
          request: buildHttpRequestDetails(reason.request)
        })
      }))
    case "StatusCodeError":
      return mapStatusCodeError(reason, method)
    case "DecodeError":
      return Effect.fail(AiError.make({
        module: "GoogleVertexClient",
        method,
        reason: new AiError.InvalidOutputError({
          description: reason.description ?? "Failed to decode response"
        })
      }))
    case "EmptyBodyError":
      return Effect.fail(AiError.make({
        module: "GoogleVertexClient",
        method,
        reason: new AiError.InvalidOutputError({
          description: reason.description ?? "Response body was empty"
        })
      }))
  }
})

/** @internal */
const mapStatusCodeError = Effect.fnUntraced(function*(
  error: HttpClientError.StatusCodeError,
  method: string
) {
  const { description, request, response } = error
  const status = response.status
  const headers = response.headers as Record<string, string>

  let body: string | undefined = description
  if (!description || !description.startsWith("{")) {
    const responseBody = yield* Effect.option(response.text)
    if (Option.isSome(responseBody) && responseBody.value) {
      body = responseBody.value
    }
  }

  const decoded = Predicate.isNotUndefined(body)
    ? Schema.decodeUnknownOption(Schema.fromJsonString(ErrorResponse))(body)
    : Option.none()

  const reason = mapStatusCodeToReason({
    status,
    headers,
    message: Option.isSome(decoded) ? decoded.value.error.message : undefined,
    http: buildHttpContext({ request, response, body }),
    metadata: {
      status: Option.isSome(decoded) ? decoded.value.error.status ?? null : null
    }
  })

  return yield* AiError.make({ module: "GoogleVertexClient", method, reason })
})

// =============================================================================
// HTTP Context
// =============================================================================

/** @internal */
export const buildHttpRequestDetails = (
  request: HttpClientRequest.HttpClientRequest
): typeof Response.HttpRequestDetails.Type => ({
  method: request.method,
  url: request.url,
  urlParams: Array.from(request.urlParams),
  hash: Option.getOrUndefined(request.hash),
  headers: Redactable.redact(request.headers) as Record<string, string>
})

/** @internal */
export const buildHttpContext = (params: {
  readonly request: HttpClientRequest.HttpClientRequest
  readonly response?: HttpClientResponse.HttpClientResponse
  readonly body?: string | undefined
}): typeof AiError.HttpContext.Type => ({
  request: buildHttpRequestDetails(params.request),
  response: Predicate.isNotUndefined(params.response)
    ? {
      status: params.response.status,
      headers: Redactable.redact(params.response.headers) as Record<string, string>
    }
    : undefined,
  body: params.body
})

// =============================================================================
// HTTP Status Code
// =============================================================================

const buildInvalidRequestDescription = (params: {
  readonly status: number
  readonly message: string | undefined
  readonly method: string
  readonly url: string
  readonly body: string | undefined
}): string => {
  const parts: Array<string> = []
  if (params.message) {
    parts.push(params.message)
  } else {
    parts.push(`HTTP ${params.status}`)
  }
  parts.push(`(${params.method} ${params.url})`)
  if (!params.message && params.body) {
    const truncated = params.body.length > 200 ? params.body.slice(0, 200) + "..." : params.body
    parts.push(`Response: ${truncated}`)
  }
  return parts.join(" ")
}

/** @internal */
export const mapStatusCodeToReason = ({ headers, http, message, metadata, status }: {
  readonly status: number
  readonly headers: Record<string, string>
  readonly message: string | undefined
  readonly metadata: GoogleVertexErrorMetadata
  readonly http: typeof AiError.HttpContext.Type
}): AiError.AiErrorReason => {
  const invalidRequestDescription = buildInvalidRequestDescription({
    status,
    message,
    method: http.request.method,
    url: http.request.url,
    body: http.body
  })

  switch (status) {
    case 400:
      return new AiError.InvalidRequestError({
        description: invalidRequestDescription,
        metadata: { googleVertex: metadata },
        http
      })
    case 401:
      return new AiError.AuthenticationError({
        kind: "InvalidKey",
        metadata: { googleVertex: metadata },
        http
      })
    case 403:
      return new AiError.AuthenticationError({
        kind: "InsufficientPermissions",
        metadata: { googleVertex: metadata },
        http
      })
    case 404:
      return new AiError.InvalidRequestError({
        description: invalidRequestDescription,
        metadata: { googleVertex: metadata },
        http
      })
    case 429: {
      const retryAfterRaw = headers["retry-after"]
      let retryAfter: Duration.Duration | undefined
      if (Predicate.isNotUndefined(retryAfterRaw)) {
        const parsed = Number.parse(retryAfterRaw)
        if (Option.isSome(parsed)) {
          retryAfter = Duration.seconds(parsed.value)
        }
      }
      return new AiError.RateLimitError({
        retryAfter,
        metadata: { googleVertex: metadata },
        http
      })
    }
    default:
      if (status >= 500) {
        return new AiError.InternalProviderError({
          description: message ?? "Server error",
          metadata: { googleVertex: metadata },
          http
        })
      }
      return new AiError.UnknownError({
        description: message,
        metadata: { googleVertex: metadata },
        http
      })
  }
}
