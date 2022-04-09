/**
 * @tsplus operator ets/RuntimeConfigFlags +
 * @tsplus fluent ets/RuntimeConfigFlags add
 */
export function add_(
  self: RuntimeConfigFlags,
  flag: RuntimeConfigFlag
): RuntimeConfigFlags {
  return RuntimeConfigFlags(self.flags + flag);
}

/**
 * @tsplus static ets/RuntimeConfigFlags/Aspects add
 */
export const add = Pipeable(add_);
