/**
 * @since 1.0.0
 */
import * as ArrayFormatter from "@effect/schema/ArrayFormatter"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
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
export interface Issue extends
  Schema.Struct<
    {
      _tag: Schema.Literal<
        ["Pointer", "Unexpected", "Missing", "Composite", "Refinement", "Transformation", "Type", "Forbidden"]
      >
      path: PropertyKeysNoSymbol
      message: typeof Schema.String
    }
  >
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export interface PropertyKeysNoSymbol extends
  Schema.transform<
    Schema.Array$<Schema.Union<[typeof Schema.String, typeof Schema.Number]>>,
    Schema.Array$<Schema.Union<[typeof Schema.SymbolFromSelf, typeof Schema.String, typeof Schema.Number]>>
  >
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const PropertyKeysNoSymbol: PropertyKeysNoSymbol = Schema.transform(
  Schema.Array(Schema.Union(Schema.String, Schema.Number)),
  Schema.Array(Schema.Union(Schema.SymbolFromSelf, Schema.String, Schema.Number)),
  {
    decode: identity,
    encode: (items) => items.filter((item) => typeof item !== "symbol")
  }
)

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
  path: PropertyKeysNoSymbol,
  message: Schema.String
})

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
    description: "HttpApiDecodeError: The request did not match the expected schema"
  })
) {
  /**
   * @since 1.0.0
   */
  static fromParseError(error: ParseResult.ParseError): Effect.Effect<HttpApiDecodeError> {
    return ArrayFormatter.formatError(error).pipe(
      Effect.zip(TreeFormatter.formatError(error)),
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
