/**
 * @tsplus getter effect/core/io/RuntimeConfig enableCurrentFiber
 * @tsplus static effect/core/io/RuntimeConfig.Aspects enableCurrentFiber
 */
export function enableCurrentFiber(self: RuntimeConfig): RuntimeConfig {
  return self.copy({ flags: self.value.flags + RuntimeConfigFlag.EnableCurrentFiber })
}
