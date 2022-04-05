/**
 * A `RuntimeConfig` provides the minimum capabilities necessary to bootstrap
 * execution of `Effect-TS` tasks.
 *
 * @tsplus type ets/RuntimeConfig
 */
export interface RuntimeConfig {
  readonly value: {
    readonly fatal: (defect: unknown) => boolean;
    readonly reportFatal: (defect: unknown) => void;
    readonly supervisor: Supervisor<any>;
    readonly logger: Logger<string, any>;
    readonly flags: RuntimeConfigFlags;
    readonly maxOp: number;
  };
}

/**
 * @tsplus type ets/RuntimeConfig/Ops
 */
export interface RuntimeConfigOps {}
export const RuntimeConfig: RuntimeConfigOps = {};

/**
 * @tsplus static ets/RuntimeConfig/Ops __call
 */
export function make(value: {
  readonly fatal: (defect: unknown) => boolean;
  readonly reportFatal: (defect: unknown) => void;
  readonly supervisor: Supervisor<any>;
  readonly logger: Logger<string, any>;
  readonly flags: RuntimeConfigFlags;
  readonly maxOp: number;
}): RuntimeConfig {
  return { value };
}
