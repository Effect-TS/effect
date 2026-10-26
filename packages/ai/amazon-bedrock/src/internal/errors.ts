import * as AiError from "effect/ai/AiError"
import type * as Response from "effect/ai/Response"
import * as Effect from "effect/Effect"
import type * as HttpClientError from "effect/http/HttpClientError"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import type * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Redactable from "effect/Redactable"
import * as Schema from "effect/Schema"
import type { EventStreamError } from "./eventStream.ts"

const module = "AmazonBedrockClient"

// =============================================================================
// Error Mappers
// =============================================================================

/** @internal */
export const mapSchemaError = (error: Schema.SchemaError, method: string): AiError.AiError =>
  AiError.make({
    module,
    method,
    reason: AiError.InvalidResponseError.fromSchemaError(error)
  })

/** @internal */
export const mapEventStreamError = (error: EventStreamError, method: string): AiError.AiError =>
  AiError.make({
    module,
    method,
    reason: error.reason === "ErrorFrame"
      ? new AiError.InternalProviderError({ description: error.description })
      : new AiError.InvalidResponseError({ description: error.description })
  })

/**
 * Maps an exception frame of a ConverseStream response, such as a
 * `throttlingException`, to the reason its REST counterpart would have.
 *
 * @internal
 */
export const mapStreamException = (
  exceptionType: string,
  message: string | undefined,
  method: string
): AiError.AiError => {
  const description = Predicate.isUndefined(message) ? exceptionType : `${exceptionType}: ${message}`
  let reason: AiError.AiErrorReason
  switch (exceptionType) {
    case "throttlingException": {
      reason = new AiError.RateLimitError({})
      break
    }
    case "validationException": {
      reason = new AiError.InvalidRequestError({ description })
      break
    }
    default: {
      reason = new AiError.InternalProviderError({ description })
    }
  }
  return AiError.make({ module, method, reason })
}

/** @internal */
export const mapHttpClientError = (
  error: HttpClientError.HttpClientError,
  method: string
): Effect.Effect<never, AiError.AiError> => {
  const reason = error.reason
  switch (reason._tag) {
    case "TransportError":
    case "EncodeError":
    case "InvalidUrlError": {
      return Effect.fail(AiError.make({
        module,
        method,
        reason: new AiError.NetworkError({
          reason: reason._tag,
          description: reason.description,
          request: buildHttpRequestDetails(reason.request)
        })
      }))
    }
    case "StatusCodeError": {
      return mapStatusCodeError(reason, method)
    }
    case "DecodeError": {
      return Effect.fail(AiError.make({
        module,
        method,
        reason: new AiError.InvalidOutputError({
          description: reason.description ?? "Failed to decode response"
        })
      }))
    }
    case "EmptyBodyError": {
      return Effect.fail(AiError.make({
        module,
        method,
        reason: new AiError.InvalidOutputError({
          description: reason.description ?? "Response body was empty"
        })
      }))
    }
  }
}

// Bedrock REST errors are flat `{ "message": "..." }` bodies (AWS uses both
// casings), with the exception type in the `x-amzn-errortype` header.
const BedrockErrorBody = Schema.fromJsonString(Schema.Struct({
  message: Schema.optional(Schema.String),
  Message: Schema.optional(Schema.String)
}))

const decodeErrorBody = Schema.decodeUnknownOption(BedrockErrorBody)

const mapStatusCodeError = Effect.fnUntraced(function*(
  error: HttpClientError.StatusCodeError,
  method: string
) {
  const { description, request, response } = error
  const status = response.status

  let body: string | undefined = description
  if (!description || !description.startsWith("{")) {
    const responseBody = yield* Effect.option(response.text)
    if (Option.isSome(responseBody) && responseBody.value) {
      body = responseBody.value
    }
  }

  const decoded = decodeErrorBody(body)
  const message = Option.isSome(decoded) ? decoded.value.message ?? decoded.value.Message : undefined

  const reason = mapStatusCodeToReason({
    status,
    message,
    errorType: extractErrorType(response.headers["x-amzn-errortype"]),
    http: buildHttpContext({ request, response, body })
  })

  return yield* AiError.make({ module, method, reason })
})

// =============================================================================
// HTTP Context
// =============================================================================

const buildHttpRequestDetails = (
  request: HttpClientRequest.HttpClientRequest
): typeof Response.HttpRequestDetails.Type => ({
  method: request.method,
  url: request.url,
  urlParams: Array.from(request.urlParams),
  hash: Option.getOrUndefined(request.hash),
  headers: Redactable.redact(request.headers) as Record<string, string>
})

const buildHttpContext = (params: {
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

/**
 * AWS sends the exception shape as `Name:http://internal.amazon.com/coral/...`.
 * Only the part before the colon identifies it.
 */
const extractErrorType = (header: string | undefined): string | undefined =>
  Predicate.isUndefined(header) ? undefined : header.split(":")[0]

/**
 * Bedrock answers 403 for several unrelated problems: a bad key, an expired
 * session token and a model the account is not entitled to all arrive as 403.
 * The exception shape in `x-amzn-errortype` distinguishes them.
 */
const authenticationKinds: Record<string, AiError.AuthenticationError["kind"]> = {
  AccessDeniedException: "InsufficientPermissions",
  ExpiredTokenException: "ExpiredKey",
  IncompleteSignatureException: "InvalidKey",
  InvalidSignatureException: "InvalidKey",
  MissingAuthenticationTokenException: "MissingKey",
  UnrecognizedClientException: "InvalidKey"
}

const mapStatusCodeToReason = ({ errorType, http, message, status }: {
  readonly status: number
  readonly message: string | undefined
  readonly errorType: string | undefined
  readonly http: typeof AiError.HttpContext.Type
}): AiError.AiErrorReason => {
  // AWS sends this with a 400, but the request is well formed: the account
  // has used up a quota.
  if (errorType === "ServiceQuotaExceededException") {
    return new AiError.QuotaExhaustedError({ http })
  }

  const describe = (text: string | undefined): string | undefined =>
    Predicate.isUndefined(errorType) ? text : Predicate.isUndefined(text) ? errorType : `${errorType}: ${text}`

  switch (status) {
    case 400:
    case 404:
    case 422: {
      const summary = message ?? `HTTP ${status}`
      return new AiError.InvalidRequestError({
        description: describe(`${summary} (${http.request.method} ${http.request.url})`),
        http
      })
    }
    case 401:
    case 403: {
      return new AiError.AuthenticationError({
        kind: (Predicate.isNotUndefined(errorType) ? authenticationKinds[errorType] : undefined)
          ?? (status === 401 ? "InvalidKey" : "InsufficientPermissions"),
        description: describe(message),
        http
      })
    }
    case 408:
    case 424: {
      // ModelTimeoutException and ModelErrorException: the model failed to
      // answer in time, or answered with an error.
      return new AiError.InternalProviderError({
        description: describe(message) ?? "Model error",
        http
      })
    }
    case 429: {
      return new AiError.RateLimitError({ http })
    }
    default: {
      if (status >= 500) {
        return new AiError.InternalProviderError({
          description: describe(message) ?? "Server error",
          http
        })
      }
      return new AiError.UnknownError({
        description: describe(message),
        http
      })
    }
  }
}
