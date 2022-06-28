/**
 * @tsplus getter effect/core/io/RuntimeConfig enableFiberRoots
 * @tsplus static effect/core/io/RuntimeConfig.Aspects enableFiberRoots
 */
export function enableFiberRoots(self: RuntimeConfig): RuntimeConfig {
  return self.copy({ flags: self.value.flags + RuntimeConfigFlag.EnableFiberRoots })
}
