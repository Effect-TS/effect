export const FiberStatusSym = Symbol.for("@effect/core/Fiber/FiberStatus")
export type FiberStatusSym = typeof FiberStatusSym

/**
 * @tsplus type effect/core/io/Fiber/Status
 */
export type FiberStatus = Done | Running | Suspended

/**
 * @tsplus type effect/core/io/Fiber/Status.Ops
 */
export interface FiberStatusOps {}
export const FiberStatus: FiberStatusOps = {}

export class Done implements Equals {
  readonly _tag = "Done"
  readonly [FiberStatusSym]: FiberStatusSym = FiberStatusSym;

  [Hash.sym](): number {
    return Hash.string(this._tag)
  }

  [Equals.sym](that: unknown): boolean {
    return isFiberStatus(that) && that._tag === "Done"
  }
}

export class Running implements Equals {
  readonly _tag = "Running"
  readonly [FiberStatusSym]: FiberStatusSym = FiberStatusSym

  constructor(readonly runtimeFlags: RuntimeFlags) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this._tag), Hash.number(this.runtimeFlags))
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === "Running" &&
      this.runtimeFlags === that.runtimeFlags
    )
  }
}

export class Suspended implements Equals {
  readonly _tag = "Suspended"
  readonly [FiberStatusSym]: FiberStatusSym = FiberStatusSym

  constructor(
    readonly runtimeFlags: RuntimeFlags,
    readonly blockingOn: FiberId
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this._tag),
      Hash.combine(
        Hash.number(this.runtimeFlags),
        Hash.unknown(this.blockingOn)
      )
    )
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === "Suspended" &&
      this.runtimeFlags === that.runtimeFlags &&
      this.blockingOn == that.blockingOn
    )
  }
}

/**
 * @tsplus static effect/core/io/Fiber/Status.Ops isFiberStatus
 */
export function isFiberStatus(u: unknown): u is FiberStatus {
  return typeof u === "object" && u != null && FiberStatusSym in u
}
