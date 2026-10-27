/**
 * Typed failure model for Effect HTTP client operations.
 *
 * HTTP clients wrap request construction, transport, status-code validation, and
 * response decoding failures in `HttpClientError`. The wrapper keeps the failed
 * request and the specific failure reason together, so callers can handle client
 * failures uniformly while still matching on the reason `_tag` for retry
 * policy, logging, metrics, and user-facing messages.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Data from "../Data.ts"
import { hasProperty } from "../Predicate.ts"
import * as Schema from "../Schema.ts"
import type * as HttpClientRequest from "./HttpClientRequest.ts"
import type * as ClientResponse from "./HttpClientResponse.ts"
import * as UrlParams from "./UrlParams.ts"

const TypeId = "~effect/http/HttpClientError"

/**
 * Returns `true` when a value is an `HttpClientError`.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isHttpClientError = (u: unknown): u is HttpClientError => hasProperty(u, TypeId)

/**
 * Error wrapper for HTTP client failures, exposing the failed request and the optional response through its `reason`.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class HttpClientError extends Data.TaggedError("HttpClientError")<{
  readonly reason: HttpClientErrorReason
}> {
  constructor(props: {
    readonly reason: HttpClientErrorReason
  }) {
    if ("cause" in props.reason) {
      super({
        ...props,
        cause: props.reason.cause
      } as any)
    } else {
      super(props)
    }
  }

  /**
   * Marks this value as an HTTP client error for runtime guards.
   *
   * @stability unstable
   * @since 4.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * HTTP request associated with the client failure.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get request(): HttpClientRequest.HttpClientRequest {
    return this.reason.request
  }

  /**
   * HTTP response associated with the client failure, when one was received.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get response(): ClientResponse.HttpClientResponse | undefined {
    return "response" in this.reason ? this.reason.response : undefined
  }

  override get message(): string {
    return this.reason.message
  }
}

const formatReason = (tag: string) => tag.endsWith("Error") ? tag.slice(0, -5) : tag

const formatMessage = (reason: string, description: string | undefined, info: string) =>
  description ? `${reason}: ${description} (${info})` : `${reason} error (${info})`

// The fiber that renders an error later, such as a span exporter, may not
// have the `UrlParams.CurrentRedactedNames` of the request. URLs are therefore
// redacted with the names active when a reason is created, plus the names of
// the fiber that executed its request.
const redactedUrls = new WeakMap<object, string>()
const requestRedactedNames = new WeakMap<HttpClientRequest.HttpClientRequest, ReadonlyArray<string | RegExp>>()

const redactedUrl = (reason: { readonly request: HttpClientRequest.HttpClientRequest }) => {
  const url = redactedUrls.get(reason) ?? UrlParams.redactUrl(reason.request.url)
  const redactedNames = requestRedactedNames.get(reason.request)
  return redactedNames === undefined ? url : UrlParams.redactUrl(url, redactedNames)
}

const ReasonError = <Tag extends string>(tag: Tag): ReturnType<typeof Data.TaggedError<Tag>> => {
  class Base extends Data.TaggedError(tag)<{ readonly request: HttpClientRequest.HttpClientRequest }> {
    constructor(props: { readonly request: HttpClientRequest.HttpClientRequest }) {
      super(props)
      redactedUrls.set(this, UrlParams.redactUrl(props.request.url))
    }
  }
  return Base as any
}

/**
 * Records the redaction names of the fiber executing a request. Errors that
 * reference the request use them, even when they are created in callbacks
 * that run outside that fiber.
 *
 * @internal
 */
export const setRequestRedactedNames = (
  request: HttpClientRequest.HttpClientRequest,
  redactedNames: ReadonlyArray<string | RegExp>
): void => {
  requestRedactedNames.set(request, redactedNames)
}

const formatMethodAndUrl = (reason: { readonly request: HttpClientRequest.HttpClientRequest }) =>
  `${reason.request.method} ${redactedUrl(reason)}`

// Serialized reasons carry the same request and response information as the
// message, so headers, URL parameters and bodies stay out of logs. The full
// objects remain available through the `request` and `response` properties.
const reasonToJSON = (reason: HttpClientErrorReason, json: unknown) => ({
  ...(json as object),
  request: { _id: "HttpClientRequest", method: reason.request.method, url: redactedUrl(reason) },
  ...("response" in reason ? { response: { _id: "HttpClientResponse", status: reason.response.status } } : undefined)
})

/**
 * Error describing transport-level failures that occur while sending an HTTP request.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class TransportError extends ReasonError("TransportError")<{
  readonly request: HttpClientRequest.HttpClientRequest
  readonly cause?: unknown
  readonly description?: string
}> {
  /**
   * Formats the request method and URL for transport error messages.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get methodAndUrl() {
    return formatMethodAndUrl(this)
  }

  /**
   * Builds the transport error message from the optional description and request details.
   *
   * @stability unstable
   * @since 4.0.0
   */
  override get message() {
    return formatMessage(formatReason(this._tag), this.description, this.methodAndUrl)
  }

  override toJSON(): unknown {
    return reasonToJSON(this, super.toJSON())
  }
}

/**
 * Error describing failures while encoding an HTTP request body.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class EncodeError extends ReasonError("EncodeError")<{
  readonly request: HttpClientRequest.HttpClientRequest
  readonly cause?: unknown
  readonly description?: string
}> {
  /**
   * Formats the request method and URL for request encoding error messages.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get methodAndUrl() {
    return formatMethodAndUrl(this)
  }

  /**
   * Builds the request encoding error message from the optional description and request details.
   *
   * @stability unstable
   * @since 4.0.0
   */
  override get message() {
    return formatMessage(formatReason(this._tag), this.description, this.methodAndUrl)
  }

  override toJSON(): unknown {
    return reasonToJSON(this, super.toJSON())
  }
}

/**
 * Error describing failures while constructing a URL from an HTTP client request.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class InvalidUrlError extends ReasonError("InvalidUrlError")<{
  readonly request: HttpClientRequest.HttpClientRequest
  readonly cause?: unknown
  readonly description?: string
}> {
  /**
   * Formats the request method and URL for invalid URL error messages.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get methodAndUrl() {
    return formatMethodAndUrl(this)
  }

  /**
   * Builds the invalid URL error message from the optional description and request details.
   *
   * @stability unstable
   * @since 4.0.0
   */
  override get message() {
    return formatMessage(formatReason(this._tag), this.description, this.methodAndUrl)
  }

  override toJSON(): unknown {
    return reasonToJSON(this, super.toJSON())
  }
}

/**
 * Response error for HTTP responses rejected because of their status code.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class StatusCodeError extends ReasonError("StatusCodeError")<{
  readonly request: HttpClientRequest.HttpClientRequest
  readonly response: ClientResponse.HttpClientResponse
  readonly cause?: unknown
  readonly description?: string | undefined
}> {
  /**
   * Formats the request method and URL for status code error messages.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get methodAndUrl() {
    return formatMethodAndUrl(this)
  }

  /**
   * Builds the status code error message from the response status, optional description, and request details.
   *
   * @stability unstable
   * @since 4.0.0
   */
  override get message() {
    const info = `${this.response.status} ${this.methodAndUrl}`
    return formatMessage(formatReason(this._tag), this.description, info)
  }

  override toJSON(): unknown {
    return reasonToJSON(this, super.toJSON())
  }
}

/**
 * Response error for failures while decoding an HTTP response, including a
 * response with an undeclared status.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class DecodeError extends ReasonError("DecodeError")<{
  readonly request: HttpClientRequest.HttpClientRequest
  readonly response: ClientResponse.HttpClientResponse
  readonly cause?: unknown
  readonly description?: string | undefined
}> {
  /**
   * Formats the request method and URL for response decoding error messages.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get methodAndUrl() {
    return formatMethodAndUrl(this)
  }

  /**
   * Builds the response decoding error message from the response status, optional description, and request details.
   *
   * @stability unstable
   * @since 4.0.0
   */
  override get message() {
    const info = `${this.response.status} ${this.methodAndUrl}`
    return formatMessage(formatReason(this._tag), this.description, info)
  }

  override toJSON(): unknown {
    return reasonToJSON(this, super.toJSON())
  }
}

/**
 * Response error for operations that expected a response body but received an empty body.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class EmptyBodyError extends ReasonError("EmptyBodyError")<{
  readonly request: HttpClientRequest.HttpClientRequest
  readonly response: ClientResponse.HttpClientResponse
  readonly cause?: unknown
  readonly description?: string | undefined
}> {
  /**
   * Formats the request method and URL for empty response body error messages.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get methodAndUrl() {
    return formatMethodAndUrl(this)
  }

  /**
   * Builds the empty body error message from the response status, optional description, and request details.
   *
   * @stability unstable
   * @since 4.0.0
   */
  override get message() {
    const info = `${this.response.status} ${this.methodAndUrl}`
    return formatMessage(formatReason(this._tag), this.description, info)
  }

  override toJSON(): unknown {
    return reasonToJSON(this, super.toJSON())
  }
}

/**
 * Union of HTTP client errors that occur before a response is available.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export type RequestError = TransportError | EncodeError | InvalidUrlError

/**
 * Union of HTTP client errors that include an HTTP response.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export type ResponseError = StatusCodeError | DecodeError | EmptyBodyError

/**
 * Union of all specific failure reasons carried by `HttpClientError`.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export type HttpClientErrorReason = RequestError | ResponseError

/**
 * Schema for serializable HTTP client errors, preserving the specific error kind
 * and cause.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export class HttpClientErrorSchema extends Schema.Error<HttpClientErrorSchema>(TypeId)({
  _tag: Schema.tag("HttpError"),
  kind: Schema.Literals(
    [
      "EncodeError",
      "DecodeError",
      "TransportError",
      "InvalidUrlError",
      "StatusCodeError",
      "EmptyBodyError"
    ] satisfies ReadonlyArray<HttpClientErrorReason["_tag"]>
  ),
  cause: Schema.optional(Schema.Defect())
}) {
  /**
   * Builds the serializable schema representation for an HTTP client error.
   *
   * @stability unstable
   * @since 4.0.0
   */
  static fromHttpClientError(error: HttpClientError): HttpClientErrorSchema {
    return new HttpClientErrorSchema({
      _tag: "HttpError",
      kind: error.reason._tag,
      cause: error.reason
    })
  }
}
