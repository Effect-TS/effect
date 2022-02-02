import type { HashSet } from "../../collection/immutable/HashSet"
import * as HS from "../../collection/immutable/HashSet"
import * as St from "../../prelude/Structural"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export const FiberIdSym = Symbol.for("@effect-ts/system/io/FiberId")
export type FiberIdSym = typeof FiberIdSym

/**
 * @tsplus type ets/FiberId
 */
export interface FiberId {
  readonly [FiberIdSym]: FiberIdSym
}

/**
 * @tsplus type ets/FiberId
 */
export interface FiberIdOps {}
export const FiberId: FiberIdOps = {}

export type RealFiberId = None | Runtime | Composite

/**
 * @ets_optimize remove
 */
export function realFiberId(fiberId: FiberId): asserts fiberId is RealFiberId {
  //
}

export interface None extends FiberId {}
export class None implements St.HasHash, St.HasEquals {
  readonly _tag = "None";

  readonly [FiberIdSym]: FiberIdSym = FiberIdSym

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](that: unknown): boolean {
    if (isFiberId(that)) {
      realFiberId(that)
      return that._tag === "None"
    }
    return false
  }
}

export interface Runtime extends FiberId {}
export class Runtime implements St.HasHash, St.HasEquals {
  readonly _tag = "Runtime";

  readonly [FiberIdSym]: FiberIdSym = FiberIdSym

  constructor(readonly id: number, readonly startTimeSeconds: number) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(St.hashNumber(this.id), St.hashNumber(this.startTimeSeconds))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isFiberId(that) && this[St.hashSym] === that[St.hashSym]
  }
}

export interface Composite extends FiberId {}
export class Composite implements St.HasHash, St.HasEquals {
  readonly _tag = "Composite";

  readonly [FiberIdSym]: FiberIdSym = FiberIdSym

  constructor(readonly fiberIds: HashSet<Runtime>) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), this.fiberIds[St.hashSym])
  }

  [St.equalsSym](that: unknown): boolean {
    if (isFiberId(that)) {
      realFiberId(that)
      return (
        that._tag === "Composite" &&
        HS.equal<FiberId>().equals(this.fiberIds, that.fiberIds)
      )
    }
    return false
  }
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/**
 * Checks if the specified unknown value is a `FiberId`.
 */
export function isFiberId(self: unknown): self is FiberId {
  return typeof self === "object" && self != null && FiberIdSym in self
}
