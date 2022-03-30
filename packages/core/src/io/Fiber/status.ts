import * as St from "../../prelude/Structural"
import type { FiberId } from "../FiberId"
import type { TraceElement } from "../TraceElement"

export const FiberStatusSym = Symbol.for("@effect-ts/core/Fiber/FiberStatus")
export type FiberStatusSym = typeof FiberStatusSym

/**
 * @tsplus type ets/FiberStatus
 */
export type FiberStatus = Done | Running | Suspended

/**
 * @tsplus type ets/FiberStatusOps
 */
export interface FiberStatusOps {}
export const FiberStatus: FiberStatusOps = {}

export class Done implements St.HasEquals {
  readonly _tag = "Done";
  readonly [FiberStatusSym]: FiberStatusSym = FiberStatusSym

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](that: unknown): boolean {
    return isFiberStatus(that) && that._tag === "Done"
  }
}

export class Running {
  readonly _tag = "Running";
  readonly [FiberStatusSym]: FiberStatusSym = FiberStatusSym

  constructor(readonly interrupting: boolean) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hash(this.interrupting))
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === "Running" &&
      this.interrupting === that.interrupting
    )
  }
}

export class Suspended {
  readonly _tag = "Suspended";
  readonly [FiberStatusSym]: FiberStatusSym = FiberStatusSym

  constructor(
    readonly interrupting: boolean,
    readonly interruptible: boolean,
    readonly asyncs: number,
    readonly blockingOn: FiberId,
    readonly asyncTrace: TraceElement
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(
        St.hash(this.interrupting),
        St.combineHash(
          St.hash(this.interruptible),
          St.combineHash(
            St.hashNumber(this.asyncs),
            St.combineHash(St.hash(this.blockingOn), St.hash(this.asyncTrace))
          )
        )
      )
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === "Suspended" &&
      this.interrupting === that.interrupting &&
      this.interruptible === that.interruptible &&
      this.asyncs === that.asyncs &&
      St.equals(this.blockingOn, that.blockingOn)
    )
  }
}

export function isFiberStatus(u: unknown): u is FiberStatus {
  return typeof u === "object" && u != null && FiberStatusSym in u
}

/**
 * @tsplus static ets/FiberStatusOps Done
 */
export const statusDone: FiberStatus = new Done()

/**
 * @tsplus static ets/FiberStatusOps Running
 */
export function statusRunning(interrupting: boolean): FiberStatus {
  return new Running(interrupting)
}

/**
 * @tsplus static ets/FiberStatusOps Suspended
 */
export function statusSuspended(
  interrupting: boolean,
  interruptible: boolean,
  asyncs: number,
  blockingOn: FiberId,
  asyncTrace: TraceElement
): FiberStatus {
  return new Suspended(interrupting, interruptible, asyncs, blockingOn, asyncTrace)
}

/**
 * @tsplus fluent ets/FiberStatus isInterrupting
 */
export function isInterrupting(self: FiberStatus): boolean {
  switch (self._tag) {
    case "Done": {
      return false
    }
    case "Running": {
      return self.interrupting
    }
    case "Suspended": {
      return self.interrupting
    }
  }
}

/**
 * @tsplus fluent ets/FiberStatus withInterrupting
 */
export function withInterrupting(
  self: FiberStatus,
  newInterrupting: boolean
): FiberStatus {
  switch (self._tag) {
    case "Done": {
      return self
    }
    case "Running": {
      return new Running(newInterrupting)
    }
    case "Suspended": {
      return new Suspended(
        newInterrupting,
        self.interruptible,
        self.asyncs,
        self.blockingOn,
        self.asyncTrace
      )
    }
  }
}
