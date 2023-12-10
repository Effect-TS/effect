/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import type * as ROA from "effect/ReadonlyArray"
import type { SchemaC } from "./SchemaC.js"
import { withConstructorTagged } from "./SchemaC.js"

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcNotFound {
  readonly _tag: "RpcNotFound"
  readonly method: string
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const RpcNotFound: SchemaC<
  RpcNotFound,
  RpcNotFound,
  { readonly method: string }
> = withConstructorTagged(
  Schema.struct({
    _tag: Schema.literal("RpcNotFound"),
    method: Schema.string
  }),
  "RpcNotFound"
)

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcDecodeFailure {
  readonly _tag: "RpcDecodeFailure"
  readonly errors: ROA.NonEmptyReadonlyArray<ParseResult.ParseIssue>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const RpcDecodeFailure: SchemaC<
  RpcDecodeFailure,
  RpcDecodeFailure,
  { readonly errors: ROA.NonEmptyReadonlyArray<ParseResult.ParseIssue> }
> = withConstructorTagged(
  Schema.struct({
    _tag: Schema.literal("RpcDecodeFailure"),
    errors: Schema.nonEmptyArray(Schema.any)
  }),
  "RpcDecodeFailure"
)

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcEncodeFailure {
  readonly _tag: "RpcEncodeFailure"
  readonly errors: ROA.NonEmptyReadonlyArray<ParseResult.ParseIssue>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const RpcEncodeFailure: SchemaC<
  RpcEncodeFailure,
  RpcEncodeFailure,
  { readonly errors: ROA.NonEmptyReadonlyArray<ParseResult.ParseIssue> }
> = withConstructorTagged(
  Schema.struct({
    _tag: Schema.literal("RpcEncodeFailure"),
    errors: Schema.nonEmptyArray(Schema.any)
  }),
  "RpcEncodeFailure"
)

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcTransportError {
  readonly _tag: "RpcTransportError"
  readonly error: unknown
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const RpcTransportError: SchemaC<
  RpcTransportError,
  RpcTransportError,
  { readonly error: unknown }
> = withConstructorTagged(
  Schema.struct({
    _tag: Schema.literal("RpcTransportError"),
    error: Schema.unknown
  }),
  "RpcTransportError"
)

/**
 * @category models
 * @since 1.0.0
 */
export type RpcError =
  | RpcDecodeFailure
  | RpcEncodeFailure
  | RpcNotFound
  | RpcTransportError

/**
 * @category schemas
 * @since 1.0.0
 */
export const RpcError = Schema.union(
  RpcDecodeFailure,
  RpcEncodeFailure,
  RpcNotFound,
  RpcTransportError
)
