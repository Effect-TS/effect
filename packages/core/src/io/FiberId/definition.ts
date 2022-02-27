import { HashSet } from "../../collection/immutable/HashSet"
import * as St from "../../prelude/Structural"
import type { TraceElement } from "../TraceElement"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export const FiberIdSym = Symbol.for("@effect-ts/core/io/FiberId")
export type FiberIdSym = typeof FiberIdSym

/**
 * @tsplus type ets/FiberId
 */
export interface FiberId {
  readonly [FiberIdSym]: FiberIdSym
}

export declare namespace FiberId {
  export interface Runtime extends FiberId {}
}

/**
 * @tsplus type ets/FiberIdOps
 */
export interface FiberIdOps {}
export const FiberId: FiberIdOps = {}

export type RealFiberId = None | Runtime | Composite

/**
 * @tsplus macro remove
 */
export function realFiberId(fiberId: FiberId): asserts fiberId is RealFiberId {
  //
}

export class None implements FiberId, St.HasHash, St.HasEquals {
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

export class Runtime implements FiberId.Runtime, St.HasHash, St.HasEquals {
  readonly _tag = "Runtime";

  readonly [FiberIdSym]: FiberIdSym = FiberIdSym

  constructor(
    readonly id: number,
    readonly startTimeSeconds: number,
    readonly location: TraceElement
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(
        St.hashNumber(this.id),
        St.combineHash(St.hashNumber(this.startTimeSeconds), St.hash(this.location))
      )
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
    return St.combineHash(St.hashString(this._tag), St.hash(this.fiberIds))
  }

  [St.equalsSym](that: unknown): boolean {
    if (isFiberId(that)) {
      realFiberId(that)
      return (
        that._tag === "Composite" &&
        HashSet.equal<FiberId>().equals(this.fiberIds, that.fiberIds)
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
