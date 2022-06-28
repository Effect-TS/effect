/**
 * @tsplus getter effect/core/io/RuntimeConfig enableLogRuntime
 * @tsplus static effect/core/io/RuntimeConfig.Aspects enableLogRuntime
 */
export function enableLogRuntime(self: RuntimeConfig): RuntimeConfig {
  return self.copy({ flags: self.value.flags + RuntimeConfigFlag.LogRuntime })
}
