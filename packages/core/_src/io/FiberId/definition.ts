export const FiberIdSym = Symbol.for("@effect/core/io/FiberId")
export type FiberIdSym = typeof FiberIdSym

/**
 * @tsplus type ets/FiberId
 */
export interface FiberId extends Equals {
  readonly [FiberIdSym]: FiberIdSym
}

export declare namespace FiberId {
  type Runtime = RuntimeFiberId
}

/**
 * @tsplus type ets/FiberId/Ops
 */
export interface FiberIdOps {
  $: FiberIdAspects
}
export const FiberId: FiberIdOps = {
  $: {}
}

/**
 * @tsplus type ets/FiberId/Aspects
 */
export interface FiberIdAspects {}

export type RealFiberId = None | RuntimeFiberId | CompositeFiberId

/**
 * @tsplus macro remove
 */
export function realFiberId(_: FiberId): asserts _ is RealFiberId {
  //
}

export class None implements FiberId, Equals {
  readonly _tag = "None"

  readonly [FiberIdSym]: FiberIdSym = FiberIdSym;

  [Hash.sym](): number {
    return Hash.string(this._tag)
  }

  [Equals.sym](that: unknown): boolean {
    if (isFiberId(that)) {
      realFiberId(that)
      return that._tag === "None"
    }
    return false
  }
}

export class RuntimeFiberId implements FiberId.Runtime, Equals {
  readonly _tag = "Runtime"

  readonly [FiberIdSym]: FiberIdSym = FiberIdSym

  constructor(
    readonly id: number,
    readonly startTimeSeconds: number,
    readonly location: TraceElement
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this._tag),
      Hash.combine(
        Hash.number(this.id),
        Hash.combine(Hash.number(this.startTimeSeconds), Hash.unknown(this.location))
      )
    )
  }

  [Equals.sym](that: unknown): boolean {
    return isFiberId(that) && this[Hash.sym]() === that[Hash.sym]()
  }
}

export class CompositeFiberId implements FiberId, Equals {
  readonly _tag = "Composite"

  readonly [FiberIdSym]: FiberIdSym = FiberIdSym

  constructor(readonly fiberIds: HashSet<FiberId.Runtime>) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this._tag), Hash.unknown(this.fiberIds))
  }

  [Equals.sym](that: unknown): boolean {
    if (isFiberId(that)) {
      realFiberId(that)
      return (
        that._tag === "Composite" &&
        this.fiberIds == that.fiberIds
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
 *
 * @tsplus static ets/FiberId/Ops isFiberId
 */
export function isFiberId(self: unknown): self is FiberId {
  return typeof self === "object" && self != null && FiberIdSym in self
}
