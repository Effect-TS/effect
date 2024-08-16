/**
 * @since 1.0.0
 */
import type * as Brand from "effect/Brand"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { hashString } from "./internal/hash.js"
import { ShardingConfig } from "./ShardingConfig.js"

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
export const Snowflake = (input: string | bigint): Snowflake =>
  typeof input === "string" ? BigInt(input) as Snowflake : input as Snowflake

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
    readonly machineId: number
    readonly sequence: number
  }

  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Generator {
    readonly unsafeNext: () => Snowflake
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

const sinceUnixEpoch = constEpochMillis - Date.UTC(1970, 0, 1)
const constBigInt10 = BigInt(10)
const constBigInt22 = BigInt(22)
const constBigInt1024 = BigInt(1024)
const constBigInt4096 = BigInt(4096)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: {
  readonly machineId: number
  readonly sequence: number
  readonly timestamp: number
}): Snowflake =>
  (BigInt(options.timestamp - constEpochMillis) << constBigInt22
    | (BigInt(options.machineId % 4096) << constBigInt10)
    | BigInt(options.sequence % 1024)) as Snowflake

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
export const machineId = (snowflake: Snowflake): number => Number((snowflake >> constBigInt10) % constBigInt4096)

/**
 * @since 1.0.0
 * @category Parts
 */
export const sequence = (snowflake: Snowflake): number => Number(snowflake % constBigInt1024)

/**
 * @since 1.0.0
 * @category Parts
 */
export const toParts = (snowflake: Snowflake): Snowflake.Parts => ({
  timestamp: timestamp(snowflake),
  machineId: machineId(snowflake),
  sequence: sequence(snowflake)
})

/**
 * @since 1.0.0
 * @category Generator
 */
export const makeGenerator: Effect.Effect<
  Snowflake.Generator,
  never,
  ShardingConfig
> = Effect.gen(function*() {
  const config = yield* ShardingConfig
  const machineId = Option.match(config.runnerAddress, {
    onNone: () => Math.floor(Math.random() * 4096),
    onSome: (runnerAddress) => Math.abs(hashString(`${runnerAddress.host}:${runnerAddress.port}`)) % 4096
  })
  const clock = yield* Effect.clock

  let sequence = 0
  let sequenceAt = clock.unsafeCurrentTimeMillis()

  return identity<Snowflake.Generator>({
    unsafeNext() {
      let now = clock.unsafeCurrentTimeMillis()

      // account for clock drift, only allow time to move forward
      if (now < sequenceAt) {
        now = sequenceAt
      } else if (now > sequenceAt) {
        // reset sequence if we're in a new millisecond
        sequence = 0
        sequenceAt = now
      } else if (sequence >= 1024) {
        // if we've hit the max sequence for this millisecond, go to the next
        // millisecond
        sequenceAt++
        sequence = 0
      }

      return make({
        machineId,
        sequence: sequence++,
        timestamp: sequenceAt
      })
    }
  })
})

/**
 * @since 1.0.0
 * @category Generator
 */
export class Generator extends Context.Tag("@effect/cluster/Snowflake/Generator")<
  Generator,
  Snowflake.Generator
>() {}

/**
 * @since 1.0.0
 * @category Generator
 */
export const layerGenerator: Layer.Layer<
  Generator,
  never,
  ShardingConfig
> = Layer.effect(Generator, makeGenerator)
