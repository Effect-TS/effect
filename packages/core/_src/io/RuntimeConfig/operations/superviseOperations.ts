/**
 * @tsplus fluent ets/RuntimeConfig superviseOperations
 * @tsplus static ets/RuntimeConfig/Aspects superviseOperations
 */
export function superviseOperations(self: RuntimeConfig): RuntimeConfig {
  return self.copy({ flags: self.value.flags + RuntimeConfigFlag.SuperviseOperations })
}
