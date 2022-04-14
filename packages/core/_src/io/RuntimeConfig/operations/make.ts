/**
 * @tsplus static ets/RuntimeConfig/Ops __call
 */
export function make(value: {
  readonly fatal: (defect: unknown) => boolean;
  readonly reportFatal: (defect: unknown) => void;
  readonly supervisor: Supervisor<unknown>;
  readonly loggers: HashSet<Logger<string, unknown>>;
  readonly flags: RuntimeConfigFlags;
  readonly maxOp: number;
}): RuntimeConfig {
  return { value };
}
