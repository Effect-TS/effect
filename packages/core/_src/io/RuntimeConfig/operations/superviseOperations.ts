/**
 * @tsplus getter effect/core/io/RuntimeConfig superviseOperations
 * @tsplus static effect/core/io/RuntimeConfig.Aspects superviseOperations
 */
export function superviseOperations(self: RuntimeConfig): RuntimeConfig {
  return self.copy({ flags: self.value.flags + RuntimeConfigFlag.SuperviseOperations })
}
