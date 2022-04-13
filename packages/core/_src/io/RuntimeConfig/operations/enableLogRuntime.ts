/**
 * @tsplus fluent ets/RuntimeConfig enableLogRuntime
 * @tsplus static ets/RuntimeConfig/Aspects enableLogRuntime
 */
export function enableLogRuntime(self: RuntimeConfig): RuntimeConfig {
  return RuntimeConfig({ ...self.value, flags: self.value.flags + RuntimeConfigFlag.LogRuntime });
}
