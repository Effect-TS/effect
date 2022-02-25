import * as St from "../../prelude/Structural"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export const RuntimeConfigFlagSym = Symbol.for("@effect-ts/core/io/RuntimeConfig/Flag")
export type RuntimeConfigFlagSym = typeof RuntimeConfigFlagSym

/**
 * @tsplus type ets/RuntimeConfigFlag
 */
export type RuntimeConfigFlag =
  | EnableCurrentFiber
  | LogRuntime
  | SuperviseOperations
  | TrackRuntimeMetrics
  | EnableFiberRoots

/**
 * @tsplus type ets/RuntimeConfigFlagOps
 */
export interface RuntimeConfigFlagOps {}
export const RuntimeConfigFlag: RuntimeConfigFlagOps = {}

export class EnableCurrentFiber implements St.HasHash, St.HasEquals {
  readonly _tag = "EnableCurrentFiber";

  readonly [RuntimeConfigFlagSym] = RuntimeConfigFlagSym

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](that: unknown) {
    return isRuntimeConfigFlag(that) && this._tag === that._tag
  }
}

export class LogRuntime implements St.HasHash, St.HasEquals {
  readonly _tag = "LogRuntime";

  readonly [RuntimeConfigFlagSym] = RuntimeConfigFlagSym

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](that: unknown) {
    return isRuntimeConfigFlag(that) && this._tag === that._tag
  }
}

export class SuperviseOperations implements St.HasHash, St.HasEquals {
  readonly _tag = "SuperviseOperations";

  readonly [RuntimeConfigFlagSym] = RuntimeConfigFlagSym

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](that: unknown) {
    return isRuntimeConfigFlag(that) && this._tag === that._tag
  }
}

export class TrackRuntimeMetrics implements St.HasHash, St.HasEquals {
  readonly _tag = "TrackRuntimeMetrics";

  readonly [RuntimeConfigFlagSym] = RuntimeConfigFlagSym

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](that: unknown) {
    return isRuntimeConfigFlag(that) && this._tag === that._tag
  }
}

export class EnableFiberRoots implements St.HasHash, St.HasEquals {
  readonly _tag = "EnableFiberRoots";

  readonly [RuntimeConfigFlagSym] = RuntimeConfigFlagSym

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](that: unknown) {
    return isRuntimeConfigFlag(that) && this._tag === that._tag
  }
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @tsplus static ets/RuntimeConfigFlagOps EnableCurrentFiber
 */
export const enableCurrentFiber: RuntimeConfigFlag = new EnableCurrentFiber()

/**
 * @tsplus static ets/RuntimeConfigFlagOps LogRuntime
 */
export const logRuntime: RuntimeConfigFlag = new LogRuntime()

/**
 * @tsplus static ets/RuntimeConfigFlagOps SuperviseOperations
 */
export const superviseOperations: RuntimeConfigFlag = new SuperviseOperations()

/**
 * @tsplus static ets/RuntimeConfigFlagOps TrackRuntimeMetrics
 */
export const trackRuntimeMetrics: RuntimeConfigFlag = new TrackRuntimeMetrics()

/**
 * @tsplus static ets/RuntimeConfigFlagOps EnableFiberRoots
 */
export const enableFiberRoots: RuntimeConfigFlag = new EnableFiberRoots()

// -----------------------------------------------------------------------------
// Utilites
// -----------------------------------------------------------------------------

/**
 * @tsplus static ets/RuntimeConfigFlagOps isRuntimeConfigFlag
 */
export function isRuntimeConfigFlag(self: unknown): self is RuntimeConfigFlag {
  return typeof self === "object" && self != null && RuntimeConfigFlagSym in self
}
