/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"
import * as HttpApiSchema from "./HttpApiSchema.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/HttpApiError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category schemas
 */
export class Issue extends Schema.ArrayFormatterIssue.annotations({
  identifier: "Issue",
  description: "Represents an error encountered while parsing a value to match the schema"
}) {}

/**
 * @since 1.0.0
 * @category errors
 */
export class HttpApiDecodeError extends Schema.TaggedError<HttpApiDecodeError>()(
  "HttpApiDecodeError",
  {
    issues: Schema.Array(Issue),
    message: Schema.String
  },
  HttpApiSchema.annotations({
    status: 400,
    description: "The request did not match the expected schema"
  })
) {
  /**
   * @since 1.0.0
   */
  static fromParseError(error: ParseResult.ParseError): Effect.Effect<HttpApiDecodeError> {
    return ParseResult.ArrayFormatter.formatError(error).pipe(
      Effect.zip(ParseResult.TreeFormatter.formatError(error)),
      Effect.map(([issues, message]) => new HttpApiDecodeError({ issues, message }))
    )
  }
  /**
   * @since 1.0.0
   */
  static refailParseError(error: ParseResult.ParseError): Effect.Effect<never, HttpApiDecodeError> {
    return Effect.flatMap(HttpApiDecodeError.fromParseError(error), Effect.fail)
  }
}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class BadRequest extends HttpApiSchema.EmptyError<BadRequest>()({
  tag: "BadRequest",
  status: 400
}) {}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class Unauthorized extends HttpApiSchema.EmptyError<Unauthorized>()({
  tag: "Unauthorized",
  status: 401
}) {}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class Forbidden extends HttpApiSchema.EmptyError<Forbidden>()({
  tag: "Forbidden",
  status: 403
}) {}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class NotFound extends HttpApiSchema.EmptyError<NotFound>()({
  tag: "NotFound",
  status: 404
}) {}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class MethodNotAllowed extends HttpApiSchema.EmptyError<MethodNotAllowed>()({
  tag: "MethodNotAllowed",
  status: 405
}) {}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class NotAcceptable extends HttpApiSchema.EmptyError<NotAcceptable>()({
  tag: "NotAcceptable",
  status: 406
}) {}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class RequestTimeout extends HttpApiSchema.EmptyError<RequestTimeout>()({
  tag: "RequestTimeout",
  status: 408
}) {}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class Conflict extends HttpApiSchema.EmptyError<Conflict>()({
  tag: "Conflict",
  status: 409
}) {}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class Gone extends HttpApiSchema.EmptyError<Gone>()({
  tag: "Gone",
  status: 410
}) {}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class InternalServerError extends HttpApiSchema.EmptyError<InternalServerError>()({
  tag: "InternalServerError",
  status: 500
}) {}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class NotImplemented extends HttpApiSchema.EmptyError<NotImplemented>()({
  tag: "NotImplemented",
  status: 501
}) {}

/**
 * @since 1.0.0
 * @category empty errors
 */
export class ServiceUnavailable extends HttpApiSchema.EmptyError<ServiceUnavailable>()({
  tag: "ServiceUnavailable",
  status: 503
}) {}
