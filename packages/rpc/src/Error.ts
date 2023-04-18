/**
 * @since 1.0.0
 */
import type * as ROA from "@effect/data/ReadonlyArray"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"

/**
 * @category constructors
 * @since 1.0.0
 */
export const RpcNotFound = Schema.struct({
  _tag: Schema.literal("RpcNotFound"),
  method: Schema.string,
})

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcNotFound extends Schema.To<typeof RpcNotFound> {}

/**
 * @category constructors
 * @since 1.0.0
 */
export const RpcDecodeFailure = Schema.struct({
  _tag: Schema.literal("RpcDecodeFailure"),
  errors: Schema.nonEmptyArray(Schema.any),
})

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcDecodeFailure {
  readonly _tag: "RpcDecodeFailure"
  readonly errors: ROA.NonEmptyReadonlyArray<ParseResult.ParseErrors>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const RpcTransportError = Schema.struct({
  _tag: Schema.literal("RpcTransportError"),
  error: Schema.unknown,
})

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcTransportError
  extends Schema.To<typeof RpcTransportError> {}

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcEncodeFailure {
  readonly _tag: "RpcEncodeFailure"
  readonly errors: ROA.NonEmptyReadonlyArray<ParseResult.ParseErrors>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const RpcEncodeFailure = Schema.struct({
  _tag: Schema.literal("RpcEncodeFailure"),
  errors: Schema.nonEmptyArray(Schema.any),
})

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
 * @category constructors
 * @since 1.0.0
 */
export const RpcError = Schema.union(
  RpcDecodeFailure,
  RpcEncodeFailure,
  RpcNotFound,
  RpcTransportError,
)
