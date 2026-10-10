/**
 * Serializable GraphQL client errors with an operation name and a
 * `Schema.TaggedError` reason.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Duration from "../Duration.ts"
import type * as HttpClientError from "../http/HttpClientError.ts"
import { hasProperty } from "../Predicate.ts"
import * as Schema from "../Schema.ts"

const TypeId = "~effect/graphql/GraphQLClientError"

/**
 * One entry of a GraphQL response's `errors` array, as described by the
 * GraphQL specification.
 *
 * **Details**
 *
 * `path[0]` is the response key the error belongs to, which is the alias when
 * the document used one, so callers can match an error to the field it hit.
 *
 * **Example** (Finding which alias an error belongs to)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { GraphQLClientError } from "effect/graphql"
 *
 * const error = Schema.decodeUnknownSync(GraphQLClientError.GraphQLError)({
 *   message: "Could not resolve to a Repository",
 *   path: ["missing", "issues"],
 *   extensions: { type: "NOT_FOUND" }
 * })
 *
 * error.path?.[0] // => "missing"
 * ```
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.0
 */
export const GraphQLError = Schema.Struct({
  message: Schema.String,
  locations: Schema.optional(Schema.Array(Schema.Struct({ line: Schema.Number, column: Schema.Number }))),
  path: Schema.optional(Schema.Array(Schema.Union([Schema.String, Schema.Number]))),
  extensions: Schema.optional(Schema.Record(Schema.String, Schema.Json))
})

/**
 * The decoded type of {@link GraphQLError}.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type GraphQLError = typeof GraphQLError.Type

/**
 * The server answered with a non-empty `errors` array.
 *
 * **Details**
 *
 * Queries and mutations fail even when partial `data` is present, since a
 * field error's `null` cannot be distinguished from a genuine `null`. Use
 * `{ partial: true }` to receive decoded `{ data, errors }` instead.
 *
 * On this error, `data` is raw. `GraphQLError.path[0]` identifies the response
 * key (or alias). HTTP 4xx responses with a GraphQL body also use this reason
 * rather than `TransportError`.
 *
 * **Example** (Inspecting the errors of a failed call)
 *
 * ```ts import.meta.vitest
 * import { GraphQLClientError } from "effect/graphql"
 *
 * const reason = new GraphQLClientError.ResponseError({
 *   errors: [{ message: "Not found", path: ["repository"] }],
 *   data: { repository: null }
 * })
 *
 * reason.isRetryable // => false
 * reason.errors.map((error) => error.path?.[0]) // => ["repository"]
 * ```
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class ResponseError
  extends Schema.TaggedError<ResponseError>("effect/graphql/GraphQLClientError/ResponseError")("ResponseError", {
    errors: Schema.NonEmptyArray(GraphQLError),
    data: Schema.optional(Schema.Json),
    extensions: Schema.optional(Schema.Record(Schema.String, Schema.Json))
  })
{
  /**
   * A `ResponseError` is never retryable: the server executed the operation
   * and reported errors for it.
   *
   * @since 4.0.0
   */
  get isRetryable(): boolean {
    return false
  }

  override get message(): string {
    return this.errors.map((error) => error.message).join("; ")
  }
}

/**
 * WebSocket close codes that are not retryable: protocol, request,
 * authentication, authorization, subprotocol and duplicate-operation errors.
 *
 * @stability experimental
 * @category constants
 * @since 4.0.0
 */
export const fatalCloseCodes: ReadonlySet<number> = new Set([1002, 4400, 4401, 4403, 4406, 4409, 4429])

/**
 * Parses a `Retry-After` header value, either a number of seconds or an HTTP
 * date, into a `Duration` measured from `now` (epoch milliseconds).
 */
const parseRetryAfter = (value: string | undefined, now: number): Duration.Duration | undefined => {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) {
    return Duration.seconds(Number(trimmed))
  }
  const date = Date.parse(trimmed)
  if (Number.isNaN(date)) return undefined
  return Duration.millis(Math.max(0, date - now))
}

/**
 * The client could not get a GraphQL response from the server: a network
 * failure, an HTTP response that is not a GraphQL response, or a closed
 * WebSocket connection.
 *
 * **Details**
 *
 * - `status` is only set for an HTTP response that is not a GraphQL response.
 * - `retryAfter` comes from the `Retry-After` header (numeric or HTTP-date
 *   form) and is encoded as milliseconds.
 * - `closeCode` is set when a WebSocket connection closed.
 * - `cause` holds the original error, such as the `HttpClientError`. Once
 *   encoded it shrinks to `{ name, message }`, the standard `Schema.Defect`
 *   behaviour.
 *
 * **Example** (Retryability of transport failures)
 *
 * ```ts import.meta.vitest
 * import { GraphQLClientError } from "effect/graphql"
 *
 * new GraphQLClientError.TransportError({ description: "ECONNREFUSED" }).isRetryable // => true
 * new GraphQLClientError.TransportError({ description: "503", status: 503 }).isRetryable // => true
 * new GraphQLClientError.TransportError({ description: "404", status: 404 }).isRetryable // => false
 * new GraphQLClientError.TransportError({ description: "closed", closeCode: 4401 }).isRetryable // => false
 * ```
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class TransportError
  extends Schema.TaggedError<TransportError>("effect/graphql/GraphQLClientError/TransportError")("TransportError", {
    description: Schema.String,
    status: Schema.optional(Schema.Int),
    retryAfter: Schema.optional(Schema.DurationFromMillis),
    closeCode: Schema.optional(Schema.Int),
    cause: Schema.optional(Schema.Defect())
  })
{
  /**
   * `true` for a network failure (no `status`), a `429` or `5xx` status, and
   * any close code that is not one of the {@link fatalCloseCodes}.
   *
   * @since 4.0.0
   */
  get isRetryable(): boolean {
    if (this.closeCode !== undefined && fatalCloseCodes.has(this.closeCode)) return false
    return this.status === undefined || this.status === 429 || this.status >= 500
  }

  override get message(): string {
    return this.description
  }

  /**
   * Converts an `HttpClientError` into a `TransportError`, reading `status` and
   * `Retry-After` from the response when there is one.
   *
   * **Details**
   *
   * An HTTP-date `Retry-After` is measured from `options.now` (epoch
   * milliseconds), which defaults to `Date.now()`. Transports pass the Effect
   * clock's current time.
   *
   * @since 4.0.0
   */
  static fromHttpClientError(
    error: HttpClientError.HttpClientError,
    options?: { readonly now?: number | undefined }
  ): TransportError {
    const response = error.response
    return new TransportError({
      description: error.message,
      status: response?.status,
      retryAfter: response === undefined
        ? undefined
        : parseRetryAfter(response.headers["retry-after"], options?.now ?? Date.now()),
      cause: error
    })
  }
}

/**
 * The variables Schema rejected the input, so nothing was sent.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class EncodeError
  extends Schema.TaggedError<EncodeError>("effect/graphql/GraphQLClientError/EncodeError")("EncodeError", {
    description: Schema.String
  })
{
  /**
   * An `EncodeError` is never retryable.
   *
   * @since 4.0.0
   */
  get isRetryable(): boolean {
    return false
  }

  override get message(): string {
    return this.description
  }
}

/**
 * The response was not a GraphQL response, or `data` did not match the result
 * Schema.
 *
 * **Details**
 *
 * A `data: null` without `errors` is also a `DecodeError`: it breaks the
 * GraphQL specification but happens in practice, and `ResponseError.errors`
 * cannot hold an empty array.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class DecodeError
  extends Schema.TaggedError<DecodeError>("effect/graphql/GraphQLClientError/DecodeError")("DecodeError", {
    description: Schema.String
  })
{
  /**
   * A `DecodeError` is never retryable.
   *
   * @since 4.0.0
   */
  get isRetryable(): boolean {
    return false
  }

  override get message(): string {
    return this.description
  }
}

/**
 * Cursor paging could not continue. Only `GraphQLClient.pages` and
 * `GraphQLClient.items` raise it, when a connection becomes `null` on a page
 * after the first, or when `hasNextPage` is `true` but `endCursor` is `null`
 * or did not advance.
 *
 * **Details**
 *
 * `cursor` is the last cursor that was sent, `null` on the first page.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class PaginationError
  extends Schema.TaggedError<PaginationError>("effect/graphql/GraphQLClientError/PaginationError")("PaginationError", {
    description: Schema.String,
    cursor: Schema.NullOr(Schema.String)
  })
{
  /**
   * A `PaginationError` is never retryable.
   *
   * @since 4.0.0
   */
  get isRetryable(): boolean {
    return false
  }

  override get message(): string {
    return this.description
  }
}

/**
 * The union of every reason a {@link GraphQLClientError} can carry.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type Reason = ResponseError | TransportError | EncodeError | DecodeError | PaginationError

/**
 * The error every `GraphQLClient` method fails with. It names the operation
 * and carries one of the five reasons; `cause` is the reason itself.
 *
 * **Example** (Retrying only what is retryable)
 *
 * ```ts import.meta.vitest
 * import { Duration, Schema } from "effect"
 * import { GraphQLClientError } from "effect/graphql"
 *
 * const error = new GraphQLClientError.GraphQLClientError({
 *   operation: "Viewer",
 *   reason: new GraphQLClientError.TransportError({
 *     description: "503 Service Unavailable",
 *     status: 503,
 *     retryAfter: Duration.seconds(30)
 *   })
 * })
 *
 * error.isRetryable // => true
 * error.retryAfter // => Duration.seconds(30)
 *
 * // Errors round-trip through their Schema
 * const encoded = Schema.encodeSync(GraphQLClientError.GraphQLClientError)(error)
 * Schema.decodeUnknownSync(GraphQLClientError.GraphQLClientError)(encoded).reason._tag // => "TransportError"
 * ```
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class GraphQLClientError extends Schema.TaggedError<GraphQLClientError>(TypeId)("GraphQLClientError", {
  operation: Schema.String,
  reason: Schema.Union([ResponseError, TransportError, EncodeError, DecodeError, PaginationError])
}) {
  /**
   * Marks this value as a GraphQL client error for runtime guards.
   *
   * @stability experimental
   * @since 4.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * The reason, exposed as the error's cause.
   *
   * @since 4.0.0
   */
  override readonly cause = this.reason

  /**
   * Delegates to the reason's `isRetryable`.
   *
   * @since 4.0.0
   */
  get isRetryable(): boolean {
    return this.reason.isRetryable
  }

  /**
   * The `Retry-After` hint of a `TransportError` reason, if any.
   *
   * @since 4.0.0
   */
  get retryAfter(): Duration.Duration | undefined {
    return this.reason._tag === "TransportError" ? this.reason.retryAfter : undefined
  }

  override get message(): string {
    return `${this.operation}: ${this.reason._tag}: ${this.reason.message}`
  }
}

/**
 * Tests whether a value is a {@link GraphQLClientError}.
 *
 * @stability experimental
 * @category guards
 * @since 4.0.0
 */
export const isGraphQLClientError = (u: unknown): u is GraphQLClientError => hasProperty(u, TypeId)
