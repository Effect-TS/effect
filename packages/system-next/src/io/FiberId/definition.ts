import type { HashSet } from "../../collection/immutable/HashSet"
import { equal } from "../../collection/immutable/HashSet"
import * as St from "../../prelude/Structural"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export const FiberIdSym = Symbol.for("@effect-ts/core/Fiber/FiberId")
export type FiberIdSym = typeof FiberIdSym

export type FiberId = None | Runtime | Composite

export class None implements St.HasHash, St.HasEquals {
  readonly _tag = "None";

  readonly [FiberIdSym] = FiberIdSym

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](that: unknown): boolean {
    return isFiberId(that) && that._tag === "None"
  }
}

export class Runtime implements St.HasHash, St.HasEquals {
  readonly _tag = "Runtime";

  readonly [FiberIdSym] = FiberIdSym

  constructor(readonly id: number, readonly startTimeSeconds: number) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(St.hashNumber(this.id), St.hashNumber(this.startTimeSeconds))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isFiberId(that) &&
      that._tag === "Runtime" &&
      this[St.hashSym] === that[St.hashSym]
    )
  }
}

export class Composite {
  readonly _tag = "Composite";

  readonly [FiberIdSym] = FiberIdSym

  constructor(readonly fiberIds: HashSet<Runtime>) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), this.fiberIds[St.hashSym])
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isFiberId(that) &&
      that._tag === "Composite" &&
      equal<FiberId>().equals(this.fiberIds, that.fiberIds)
    )
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
