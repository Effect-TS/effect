/**
 * @since 1.0.0
 */
import * as ArrayFormatter from "@effect/schema/ArrayFormatter"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import * as Effect from "effect/Effect"
import { AnnotationStatus } from "./ApiEndpoint.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/ApiError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category schemas
 */
export interface Issue extends
  Schema.Struct<
    {
      _tag: Schema.Literal<
        ["Pointer", "Unexpected", "Missing", "Composite", "Refinement", "Transformation", "Type", "Forbidden"]
      >
      path: Schema.Array$<Schema.Union<[typeof Schema.Symbol, typeof Schema.String, typeof Schema.Number]>>
      message: typeof Schema.String
    }
  >
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Issue: Issue = Schema.Struct({
  _tag: Schema.Literal(
    "Pointer",
    "Unexpected",
    "Missing",
    "Composite",
    "Refinement",
    "Transformation",
    "Type",
    "Forbidden"
  ),
  path: Schema.Array(Schema.Union(Schema.Symbol, Schema.String, Schema.Number)),
  message: Schema.String
})

/**
 * @since 1.0.0
 * @category errors
 */
export class ApiDecodeError extends Schema.TaggedError<ApiDecodeError>()("ApiDecodeError", {
  issues: Schema.Array(Issue),
  message: Schema.String
}, {
  [AnnotationStatus]: 400
}) {
  /**
   * @since 1.0.0
   */
  static fromParseError(error: ParseResult.ParseError): Effect.Effect<ApiDecodeError> {
    return ArrayFormatter.formatError(error).pipe(
      Effect.zip(TreeFormatter.formatError(error)),
      Effect.map(([issues, message]) => new ApiDecodeError({ issues, message }))
    )
  }
  /**
   * @since 1.0.0
   */
  static refailParseError(error: ParseResult.ParseError): Effect.Effect<never, ApiDecodeError> {
    return Effect.flatMap(ApiDecodeError.fromParseError(error), Effect.fail)
  }
}
