/**
 * @tsplus fluent ets/RuntimeConfigFlags isEnabled
 */
export function isEnabled_(self: RuntimeConfigFlags, flag: RuntimeConfigFlag): boolean {
  return self.flags.has(flag);
}

/**
 * @tsplus type ets/RuntimeConfigFlags/Aspects isEnabled
 */
export const isEnabled = Pipeable(isEnabled_);
