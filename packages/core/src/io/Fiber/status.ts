import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

export const FiberStatusSym = Symbol.for("@effect/core/Fiber/FiberStatus")
export type FiberStatusSym = typeof FiberStatusSym

/**
 * @tsplus type effect/core/io/Fiber/Status
 * @category model
 * @since 1.0.0
 */
export type FiberStatus = Done | Running | Suspended

/**
 * @tsplus type effect/core/io/Fiber/Status.Ops
 * @category model
 * @since 1.0.0
 */
export interface FiberStatusOps {}
export const FiberStatus: FiberStatusOps = {}

/**
 * @category constructors
 * @since 1.0.0
 */
export class Done implements Equal.Equal {
  readonly _tag = "Done"
  readonly [FiberStatusSym]: FiberStatusSym = FiberStatusSym;

  [Equal.symbolHash](): number {
    return Equal.hash(this._tag)
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isFiberStatus(that) && that._tag === "Done"
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export class Running implements Equal.Equal {
  readonly _tag = "Running"
  readonly [FiberStatusSym]: FiberStatusSym = FiberStatusSym

  constructor(readonly runtimeFlags: RuntimeFlags) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(this._tag),
      Equal.hashCombine(Equal.hash(this.runtimeFlags))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === "Running" &&
      this.runtimeFlags === that.runtimeFlags
    )
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export class Suspended implements Equal.Equal {
  readonly _tag = "Suspended"
  readonly [FiberStatusSym]: FiberStatusSym = FiberStatusSym

  constructor(
    readonly runtimeFlags: RuntimeFlags,
    readonly blockingOn: FiberId
  ) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(this._tag),
      Equal.hashCombine(Equal.hash(this.runtimeFlags)),
      Equal.hashCombine(Equal.hash(this.blockingOn))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === "Suspended" &&
      this.runtimeFlags === that.runtimeFlags &&
      Equal.equals(this.blockingOn, that.blockingOn)
    )
  }
}

/**
 * @tsplus static effect/core/io/Fiber/Status.Ops isFiberStatus
 * @category refinements
 * @since 1.0.0
 */
export function isFiberStatus(u: unknown): u is FiberStatus {
  return typeof u === "object" && u != null && FiberStatusSym in u
}
