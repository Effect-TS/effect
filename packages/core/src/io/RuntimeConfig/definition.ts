import type { Supervisor } from "../../io/Supervisor"
import type { Logger } from "../Logger"
import type { RuntimeConfigFlags } from "./Flags"

/**
 * A `RuntimeConfig` provides the minimum capabilities necessary to bootstrap
 * execution of `Effect-TS` tasks.
 */
export class RuntimeConfig {
  constructor(
    readonly value: {
      readonly fatal: (defect: unknown) => boolean
      readonly reportFatal: (defect: unknown) => void
      readonly supervisor: Supervisor<any>
      readonly logger: Logger<string, any>
      readonly flags: RuntimeConfigFlags
      readonly maxOp: number
    }
  ) {}
}
