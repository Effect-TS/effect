/**
 * @tsplus fluent ets/RuntimeConfig superviseOperations
 * @tsplus static ets/RuntimeConfig/Aspects superviseOperations
 */
export function superviseOperations(self: RuntimeConfig): RuntimeConfig {
  return RuntimeConfig({ ...self.value, flags: self.value.flags + RuntimeConfigFlag.SuperviseOperations });
}
