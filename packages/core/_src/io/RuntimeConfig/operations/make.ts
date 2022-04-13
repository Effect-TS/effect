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
