// ets_tracing: off

import * as St from "../../Structural"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export const RuntimeConfigFlagSym = Symbol()
export type RuntimeConfigFlagSym = typeof RuntimeConfigFlagSym

export type RuntimeConfigFlag =
  | EnableCurrentFiber
  | LogRuntime
  | SuperviseOperations
  | TrackRuntimeMetrics
  | EnableFiberRoots

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

export const enableCurrentFiber: RuntimeConfigFlag = new EnableCurrentFiber()

export const logRuntime: RuntimeConfigFlag = new LogRuntime()

export const superviseOperations: RuntimeConfigFlag = new SuperviseOperations()

export const trackRuntimeMetrics: RuntimeConfigFlag = new TrackRuntimeMetrics()

export const enableFiberRoots: RuntimeConfigFlag = new EnableFiberRoots()

// -----------------------------------------------------------------------------
// Utilites
// -----------------------------------------------------------------------------

export function isRuntimeConfigFlag(self: unknown): self is RuntimeConfigFlag {
  return typeof self === "object" && self != null && RuntimeConfigFlagSym in self
}
