/**
 * @since 1.0.0
 */
import type * as Brand from "effect/Brand"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { ShardId } from "./ShardId.js"

/**
 * @since 1.0.0
 * @category Symbols
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/Snowflake")

/**
 * @since 1.0.0
 * @category Symbols
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category Models
 */
export type Snowflake = Brand.Branded<bigint, TypeId>

/**
 * @since 1.0.0
 * @category Models
 */
export declare namespace Snowflake {
  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Parts {
    readonly timestamp: number
    readonly shardId: ShardId
    readonly sequence: number
  }

  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Generator {
    readonly unsafeNext: (shardId: ShardId) => Snowflake
  }
}

/**
 * @since 1.0.0
 * @category Schemas
 */
export const SnowflakeFromBigInt: Schema.Schema<Snowflake, bigint> = Schema.BigIntFromSelf.pipe(
  Schema.brand(TypeId)
)

/**
 * @since 1.0.0
 * @category Schemas
 */
export const SnowflakeFromString: Schema.Schema<Snowflake, string> = Schema.BigInt.pipe(
  Schema.brand(TypeId)
)

/**
 * @since 1.0.0
 * @category Epoch
 */
export const constEpochMillis: number = Date.UTC(2025, 0, 1)

const epochMillis = BigInt(constEpochMillis)
const sinceUnixEpoch = constEpochMillis - Date.UTC(1970, 0, 1)
const constBigInt12 = BigInt(12)
const constBigInt22 = BigInt(22)
const constBigInt1024 = BigInt(1024)
const constBigInt4096 = BigInt(4096)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: {
  readonly shardId: ShardId
  readonly sequence: number
  readonly timestamp: number
}): Snowflake =>
  ((BigInt(options.timestamp) - epochMillis) << constBigInt22
    | (BigInt(options.shardId) << constBigInt12)
    | BigInt(options.sequence)) as Snowflake

/**
 * @since 1.0.0
 * @category Parts
 */
export const timestamp = (snowflake: Snowflake): number => Number(snowflake >> constBigInt22) + sinceUnixEpoch

/**
 * @since 1.0.0
 * @category Parts
 */
export const dateTime = (snowflake: Snowflake): DateTime.Utc => DateTime.unsafeMake(timestamp(snowflake))

/**
 * @since 1.0.0
 * @category Parts
 */
export const shardId = (snowflake: Snowflake): ShardId =>
  ShardId.make(Number((snowflake >> constBigInt12) % constBigInt1024))

/**
 * @since 1.0.0
 * @category Parts
 */
export const toParts = (snowflake: Snowflake): Snowflake.Parts => ({
  timestamp: timestamp(snowflake),
  shardId: shardId(snowflake),
  sequence: Number(snowflake % constBigInt4096)
})

/**
 * @since 1.0.0
 * @category Generator
 */
export const makeGenerator = Effect.gen(function*() {
  const clock = yield* Effect.clock
  let sequence = 0
  let sequenceAt = clock.unsafeCurrentTimeMillis()
  return identity<Snowflake.Generator>({
    unsafeNext(shardId) {
      const now = clock.unsafeCurrentTimeMillis()
      if (now !== sequenceAt) {
        sequence = 0
        sequenceAt = now
      }
      return make({
        shardId,
        sequence: sequence++,
        timestamp: clock.unsafeCurrentTimeMillis()
      })
    }
  })
})

/**
 * @since 1.0.0
 * @category Generator
 */
export class Generator extends Context.Tag("@effect/cluster/Snowflake/Generator")<Generator, Snowflake.Generator>() {}

/**
 * @since 1.0.0
 * @category Generator
 */
export const layerGenerator: Layer.Layer<Generator> = Layer.effect(Generator, makeGenerator)
