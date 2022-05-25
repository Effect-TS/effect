/**
 * @tsplus fluent ets/RuntimeConfig enableCurrentFiber
 * @tsplus static ets/RuntimeConfig/Aspects enableCurrentFiber
 */
export function enableCurrentFiber(self: RuntimeConfig): RuntimeConfig {
  return self.copy({ flags: self.value.flags + RuntimeConfigFlag.EnableCurrentFiber })
}
