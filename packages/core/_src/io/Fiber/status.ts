export const FiberStatusSym = Symbol.for("@effect/core/Fiber/FiberStatus")
export type FiberStatusSym = typeof FiberStatusSym

/**
 * @tsplus type ets/Fiber/Status
 */
export type FiberStatus = Done | Running | Suspended

/**
 * @tsplus type ets/Fiber/Status/Ops
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

  constructor(readonly interrupting: boolean) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this._tag), Hash.unknown(this.interrupting))
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === "Running" &&
      this.interrupting === that.interrupting
    )
  }
}

export class Suspended implements Equals {
  readonly _tag = "Suspended"
  readonly [FiberStatusSym]: FiberStatusSym = FiberStatusSym

  constructor(
    readonly interrupting: boolean,
    readonly interruptible: boolean,
    readonly asyncs: number,
    readonly blockingOn: FiberId,
    readonly asyncTrace: TraceElement
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this._tag),
      Hash.combine(
        Hash.unknown(this.interrupting),
        Hash.combine(
          Hash.unknown(this.interruptible),
          Hash.combine(
            Hash.number(this.asyncs),
            Hash.combine(Hash.unknown(this.blockingOn), Hash.unknown(this.asyncTrace))
          )
        )
      )
    )
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === "Suspended" &&
      this.interrupting === that.interrupting &&
      this.interruptible === that.interruptible &&
      this.asyncs === that.asyncs &&
      this.blockingOn == that.blockingOn
    )
  }
}

/**
 * @tsplus static ets/Fiber/Status/Ops isFiberStatus
 */
export function isFiberStatus(u: unknown): u is FiberStatus {
  return typeof u === "object" && u != null && FiberStatusSym in u
}

/**
 * @tsplus static ets/Fiber/Status/Ops Done
 */
export const statusDone: FiberStatus = new Done()

/**
 * @tsplus static ets/Fiber/Status/Ops Running
 */
export function statusRunning(interrupting: boolean): FiberStatus {
  return new Running(interrupting)
}

/**
 * @tsplus static ets/Fiber/Status/Ops Suspended
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
 * @tsplus getter ets/Fiber/Status isInterrupting
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
 * @tsplus fluent ets/Fiber/Status withInterrupting
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
