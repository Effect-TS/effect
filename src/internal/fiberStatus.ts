import * as Equal from "../Equal"
import type { FiberId } from "../FiberId"
import type * as FiberStatus from "../FiberStatus"
import { pipe } from "../Function"
import * as Hash from "../Hash"
import type { RuntimeFlags } from "../RuntimeFlags"

const FiberStatusSymbolKey = "effect/FiberStatus"

/** @internal */
export const FiberStatusTypeId: FiberStatus.FiberStatusTypeId = Symbol.for(
  FiberStatusSymbolKey
) as FiberStatus.FiberStatusTypeId

/** @internal */
export const OP_DONE = "Done" as const

/** @internal */
export type OP_DONE = typeof OP_DONE

/** @internal */
export const OP_RUNNING = "Running" as const

/** @internal */
export type OP_RUNNING = typeof OP_RUNNING

/** @internal */
export const OP_SUSPENDED = "Suspended" as const

/** @internal */
export type OP_SUSPENDED = typeof OP_SUSPENDED

/** @internal */
class Done implements FiberStatus.Done {
  readonly [FiberStatusTypeId]: FiberStatus.FiberStatusTypeId = FiberStatusTypeId
  readonly _tag = OP_DONE;
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(FiberStatusSymbolKey),
      Hash.combine(Hash.hash(this._tag))
    )
  }
  [Equal.symbol](that: unknown): boolean {
    return isFiberStatus(that) && that._tag === OP_DONE
  }
}

/** @internal */
class Running implements FiberStatus.Running {
  readonly [FiberStatusTypeId]: FiberStatus.FiberStatusTypeId = FiberStatusTypeId
  readonly _tag = OP_RUNNING
  constructor(readonly runtimeFlags: RuntimeFlags) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(FiberStatusSymbolKey),
      Hash.combine(Hash.hash(this._tag)),
      Hash.combine(Hash.hash(this.runtimeFlags))
    )
  }
  [Equal.symbol](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === OP_RUNNING &&
      this.runtimeFlags === that.runtimeFlags
    )
  }
}

/** @internal */
class Suspended implements FiberStatus.Suspended {
  readonly [FiberStatusTypeId]: FiberStatus.FiberStatusTypeId = FiberStatusTypeId
  readonly _tag = OP_SUSPENDED
  constructor(
    readonly runtimeFlags: RuntimeFlags,
    readonly blockingOn: FiberId
  ) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(FiberStatusSymbolKey),
      Hash.combine(Hash.hash(this._tag)),
      Hash.combine(Hash.hash(this.runtimeFlags)),
      Hash.combine(Hash.hash(this.blockingOn))
    )
  }
  [Equal.symbol](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === OP_SUSPENDED &&
      this.runtimeFlags === that.runtimeFlags &&
      Equal.equals(this.blockingOn, that.blockingOn)
    )
  }
}

/** @internal */
export const done: FiberStatus.FiberStatus = new Done()

/** @internal */
export const running = (runtimeFlags: RuntimeFlags): FiberStatus.FiberStatus => new Running(runtimeFlags)

/** @internal */
export const suspended = (
  runtimeFlags: RuntimeFlags,
  blockingOn: FiberId
): FiberStatus.FiberStatus => new Suspended(runtimeFlags, blockingOn)

/** @internal */
export const isFiberStatus = (u: unknown): u is FiberStatus.FiberStatus =>
  typeof u === "object" && u != null && FiberStatusTypeId in u

/** @internal */
export const isDone = (self: FiberStatus.FiberStatus): self is FiberStatus.Done => self._tag === OP_DONE

/** @internal */
export const isRunning = (self: FiberStatus.FiberStatus): self is FiberStatus.Running => self._tag === OP_RUNNING

/** @internal */
export const isSuspended = (self: FiberStatus.FiberStatus): self is FiberStatus.Suspended => self._tag === OP_SUSPENDED
