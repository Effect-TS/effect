import { IO } from "../../io-light/IO"
import * as St from "../../prelude/Structural"
import type { FiberId } from "../FiberId"
import type { TraceElement } from "../TraceElement"

export const FiberStatusSym = Symbol.for("@effect-ts/core/Fiber/FiberStatus")
export type FiberStatusSym = typeof FiberStatusSym

/**
 * @tsplus type ets/FiberStatus
 */
export type FiberStatus = Done | Finishing | Running | Suspended

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

export class Finishing {
  readonly _tag = "Finishing";
  readonly [FiberStatusSym]: FiberStatusSym = FiberStatusSym

  constructor(readonly interrupting: boolean) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hash(this.interrupting))
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === "Finishing" &&
      this.interrupting === that.interrupting
    )
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
    readonly previous: FiberStatus,
    readonly interruptible: boolean,
    readonly blockingOn: FiberId,
    readonly epoch: number,
    readonly asyncTrace: TraceElement
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(
        St.hash(this.previous),
        St.combineHash(
          St.hash(this.blockingOn),
          St.combineHash(
            St.hash(this.interruptible),
            St.combineHash(St.hashNumber(this.epoch), St.hash(this.asyncTrace))
          )
        )
      )
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === "Suspended" &&
      St.equals(this.previous, that.previous) &&
      this.interruptible === that.interruptible &&
      this.epoch === that.epoch &&
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
 * @tsplus static ets/FiberStatusOps Finishing
 */
export function statsFinishing(interrupting: boolean): FiberStatus {
  return new Finishing(interrupting)
}

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
  previous: FiberStatus,
  interruptible: boolean,
  blockingOn: FiberId,
  epoch: number,
  asyncTrace: TraceElement
): FiberStatus {
  return new Suspended(previous, interruptible, blockingOn, epoch, asyncTrace)
}

/**
 * @tsplus fluent ets/FiberStatus isDone
 */
export function isDone(self: FiberStatus): boolean {
  return self._tag === "Done"
}

/**
 * @tsplus fluent ets/FiberStatus isInterrupting
 */
export function isInterrupting(self: FiberStatus): boolean {
  return isInterruptingSafe(self).run()
}

function isInterruptingSafe(self: FiberStatus): IO<boolean> {
  switch (self._tag) {
    case "Done": {
      return IO.succeed(false)
    }
    case "Finishing": {
      return IO.succeed(self.interrupting)
    }
    case "Running": {
      return IO.succeed(self.interrupting)
    }
    case "Suspended": {
      return IO.suspend(isInterruptingSafe(self.previous))
    }
  }
}

/**
 * @tsplus fluent ets/FiberStatus withInterrupting
 */
export function withInterrupting(
  self: FiberStatus,
  interrupting: boolean
): FiberStatus {
  return withInterruptingSafe(self, interrupting).run()
}

function withInterruptingSafe(
  self: FiberStatus,
  interrupting: boolean
): IO<FiberStatus> {
  switch (self._tag) {
    case "Done": {
      return IO.succeed(self)
    }
    case "Finishing": {
      return IO.succeed(new Finishing(interrupting))
    }
    case "Running": {
      return IO.succeed(new Running(interrupting))
    }
    case "Suspended": {
      return IO.suspend(withInterruptingSafe(self.previous, interrupting)).map(
        (previous) =>
          new Suspended(
            previous,
            self.interruptible,
            self.blockingOn,
            self.epoch,
            self.asyncTrace
          )
      )
    }
  }
}

/**
 * @tsplus fluent ets/FiberStatus toFinishing
 */
export function toFinishing(self: FiberStatus): FiberStatus {
  return toFinishingSafe(self).run()
}

function toFinishingSafe(self: FiberStatus): IO<FiberStatus> {
  switch (self._tag) {
    case "Done": {
      return IO.succeed(self)
    }
    case "Finishing": {
      return IO.succeed(self)
    }
    case "Running": {
      return IO.succeed(self)
    }
    case "Suspended": {
      return IO.suspend(toFinishingSafe(self.previous))
    }
  }
}
