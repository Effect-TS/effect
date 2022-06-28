/**
 * @tsplus static effect/core/io/RuntimeConfig.Aspects copy
 * @tsplus pipeable effect/core/io/RuntimeConfig copy
 */
export function copy(
  params: Partial<{
    readonly fatal: (defect: unknown) => boolean
    readonly reportFatal: (defect: unknown) => void
    readonly supervisor: Supervisor<unknown>
    readonly loggers: HashSet<Logger<string, unknown>>
    readonly flags: RuntimeConfigFlags
    readonly maxOp: number
  }>
) {
  return (self: RuntimeConfig): RuntimeConfig => RuntimeConfig({ ...self.value, ...params })
}
