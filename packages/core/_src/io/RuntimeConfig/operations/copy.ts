/**
 * @tsplus fluent ets/RuntimeConfig copy
 */
export function copy_(
  self: RuntimeConfig,
  params: Partial<{
    readonly fatal: (defect: unknown) => boolean
    readonly reportFatal: (defect: unknown) => void
    readonly supervisor: Supervisor<unknown>
    readonly loggers: HashSet<Logger<string, unknown>>
    readonly flags: RuntimeConfigFlags
    readonly maxOp: number
  }>
): RuntimeConfig {
  return RuntimeConfig({ ...self.value, ...params })
}

/**
 * @tsplus static ets/RuntimeConfig/Aspects copy
 */
export const copy = Pipeable(copy_)
