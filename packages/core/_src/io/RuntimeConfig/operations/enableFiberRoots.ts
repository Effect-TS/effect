/**
 * @tsplus fluent ets/RuntimeConfig enableFiberRoots
 * @tsplus static ets/RuntimeConfig/Aspects enableFiberRoots
 */
export function enableFiberRoots(self: RuntimeConfig): RuntimeConfig {
  return RuntimeConfig({ ...self.value, flags: self.value.flags + RuntimeConfigFlag.EnableFiberRoots });
}
