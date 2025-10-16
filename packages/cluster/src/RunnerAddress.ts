/**
 * @since 1.0.0
 */
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import { NodeInspectSymbol } from "effect/Inspectable"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Schema from "effect/Schema"

const SymbolKey = "@effect/cluster/RunnerAddress"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(SymbolKey)

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export class RunnerAddress extends Schema.Class<RunnerAddress>(SymbolKey)({
  host: Schema.NonEmptyString,
  port: Schema.Int
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId;

  /**
   * @since 1.0.0
   */
  [PrimaryKey.symbol](): string {
    return `${this.host}:${this.port}`
  }

  /**
   * @since 1.0.0
   */
  [Equal.symbol](that: RunnerAddress): boolean {
    return this.host === that.host && this.port === that.port
  }

  /**
   * @since 1.0.0
   */
  [Hash.symbol]() {
    return Hash.cached(this, Hash.string(this.toString()))
  }

  /**
   * @since 1.0.0
   */
  toString(): string {
    return `RunnerAddress(${this.host}:${this.port})`
  }

  /**
   * @since 1.0.0
   */
  [NodeInspectSymbol](): string {
    return this.toString()
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (host: string, port: number): RunnerAddress => new RunnerAddress({ host, port })
