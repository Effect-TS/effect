/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"
import { IntegerFromString } from "./internal/schemas.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const ShardId = Schema.Int.pipe(
  Schema.brand("ShardId"),
  Schema.annotations({
    pretty: () => (shardId) => `ShardId(${shardId})`
  })
)

/**
 * @since 1.0.0
 * @category models
 */
export type ShardId = typeof ShardId.Type

/**
 * @since 1.0.0
 * @category schemas
 */
export const ShardIdFromString = IntegerFromString.pipe(
  Schema.compose(ShardId)
)
