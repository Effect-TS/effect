/**
 * @tsplus fluent ets/RuntimeConfig enableCurrentFiber
 * @tsplus static ets/RuntimeConfig/Aspects enableCurrentFiber
 */
export function enableCurrentFiber(self: RuntimeConfig): RuntimeConfig {
  return RuntimeConfig({ ...self.value, flags: self.value.flags + RuntimeConfigFlag.EnableCurrentFiber });
}
