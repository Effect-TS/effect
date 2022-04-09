export const RuntimeConfigFlagSym = Symbol.for("@effect/core/io/RuntimeConfig/Flag");
export type RuntimeConfigFlagSym = typeof RuntimeConfigFlagSym;

/**
 * @tsplus type ets/RuntimeConfigFlag
 */
export type RuntimeConfigFlag =
  | EnableCurrentFiber
  | LogRuntime
  | SuperviseOperations
  | TrackRuntimeMetrics
  | EnableFiberRoots;

/**
 * @tsplus type ets/RuntimeConfigFlag/Ops
 */
export interface RuntimeConfigFlagOps {}
export const RuntimeConfigFlag: RuntimeConfigFlagOps = {};

export class EnableCurrentFiber implements Equals {
  readonly _tag = "EnableCurrentFiber";

  readonly [RuntimeConfigFlagSym] = RuntimeConfigFlagSym;

  [Hash.sym](): number {
    return Hash.string(this._tag);
  }

  [Equals.sym](that: unknown) {
    return isRuntimeConfigFlag(that) && this._tag === that._tag;
  }
}

export class LogRuntime implements Equals {
  readonly _tag = "LogRuntime";

  readonly [RuntimeConfigFlagSym] = RuntimeConfigFlagSym;

  [Hash.sym](): number {
    return Hash.string(this._tag);
  }

  [Equals.sym](that: unknown) {
    return isRuntimeConfigFlag(that) && this._tag === that._tag;
  }
}

export class SuperviseOperations implements Equals {
  readonly _tag = "SuperviseOperations";

  readonly [RuntimeConfigFlagSym] = RuntimeConfigFlagSym;

  [Hash.sym](): number {
    return Hash.string(this._tag);
  }

  [Equals.sym](that: unknown) {
    return isRuntimeConfigFlag(that) && this._tag === that._tag;
  }
}

export class TrackRuntimeMetrics implements Equals {
  readonly _tag = "TrackRuntimeMetrics";

  readonly [RuntimeConfigFlagSym] = RuntimeConfigFlagSym;

  [Hash.sym](): number {
    return Hash.string(this._tag);
  }

  [Equals.sym](that: unknown) {
    return isRuntimeConfigFlag(that) && this._tag === that._tag;
  }
}

export class EnableFiberRoots implements Equals {
  readonly _tag = "EnableFiberRoots";

  readonly [RuntimeConfigFlagSym] = RuntimeConfigFlagSym;

  [Hash.sym](): number {
    return Hash.string(this._tag);
  }

  [Equals.sym](that: unknown) {
    return isRuntimeConfigFlag(that) && this._tag === that._tag;
  }
}

/**
 * @tsplus static ets/RuntimeConfigFlag/Ops EnableCurrentFiber
 */
export const enableCurrentFiber: RuntimeConfigFlag = new EnableCurrentFiber();

/**
 * @tsplus static ets/RuntimeConfigFlag/Ops LogRuntime
 */
export const logRuntime: RuntimeConfigFlag = new LogRuntime();

/**
 * @tsplus static ets/RuntimeConfigFlag/Ops SuperviseOperations
 */
export const superviseOperations: RuntimeConfigFlag = new SuperviseOperations();

/**
 * @tsplus static ets/RuntimeConfigFlag/Ops TrackRuntimeMetrics
 */
export const trackRuntimeMetrics: RuntimeConfigFlag = new TrackRuntimeMetrics();

/**
 * @tsplus static ets/RuntimeConfigFlag/Ops EnableFiberRoots
 */
export const enableFiberRoots: RuntimeConfigFlag = new EnableFiberRoots();

/**
 * @tsplus static ets/RuntimeConfigFlag/Ops isRuntimeConfigFlag
 */
export function isRuntimeConfigFlag(self: unknown): self is RuntimeConfigFlag {
  return typeof self === "object" && self != null && RuntimeConfigFlagSym in self;
}
