/**
 * @tsplus getter ets/RuntimeConfig enableLogRuntime
 * @tsplus static ets/RuntimeConfig/Aspects enableLogRuntime
 */
export function enableLogRuntime(self: RuntimeConfig): RuntimeConfig {
  return self.copy({ flags: self.value.flags + RuntimeConfigFlag.LogRuntime })
}
