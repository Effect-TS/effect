/**
 * @since 1.0.0
 */
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as S from "effect/Schema"

/**
 * @since 1.0.0
 * @category Symbols
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/ShardId")

/**
 * @since 1.0.0
 * @category Symbols
 */
export type TypeId = typeof TypeId

const constDisableValidation = { disableValidation: true }

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (group: string, id: number): ShardId => {
  const key = `${group}:${id}`
  let shardId = shardIdCache.get(key)
  if (!shardId) {
    shardId = new ShardId({ group, id }, constDisableValidation)
    shardIdCache.set(key, shardId)
  }
  return shardId
}

const shardIdCache = new Map<string, ShardId>()

/**
 * @since 1.0.0
 * @category Models
 */
export class ShardId extends S.Class<ShardId>("@effect/cluster/ShardId")({
  group: S.String,
  id: S.Int
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId;

  /**
   * @since 1.0.0
   */
  [Equal.symbol](that: ShardId): boolean {
    return this.group === that.group && this.id === that.id
  }

  /**
   * @since 1.0.0
   */
  [Hash.symbol](): number {
    return Hash.cached(this, Hash.string(this.toString()))
  }

  /**
   * @since 1.0.0
   */
  toString(): string {
    return `${this.group}:${this.id}`
  }

  /**
   * @since 1.0.0
   */
  static toString(shardId: {
    readonly group: string
    readonly id: number
  }): string {
    return `${shardId.group}:${shardId.id}`
  }

  /**
   * @since 1.0.0
   */
  static fromStringEncoded(s: string): {
    readonly group: string
    readonly id: number
  } {
    const index = s.lastIndexOf(":")
    if (index === -1) {
      throw new Error(`Invalid ShardId format`)
    }
    const group = s.substring(0, index)
    const id = Number(s.substring(index + 1))
    if (isNaN(id)) {
      throw new Error(`ShardId id must be a number`)
    }
    return { group, id }
  }

  /**
   * @since 4.0.0
   */
  static fromString(s: string): ShardId {
    const encoded = ShardId.fromStringEncoded(s)
    return make(encoded.group, encoded.id)
  }
}
