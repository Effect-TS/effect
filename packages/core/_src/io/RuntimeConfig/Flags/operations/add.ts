/**
 * @tsplus pipeable-operator effect/core/io/RuntimeConfig/RuntimeConfigFlags +
 * @tsplus static effect/core/io/RuntimeConfig/RuntimeConfigFlags.Aspects add
 * @tsplus pipeable effect/core/io/RuntimeConfig/RuntimeConfigFlags add
 */
export function add(flag: RuntimeConfigFlag) {
  return (self: RuntimeConfigFlags): RuntimeConfigFlags => RuntimeConfigFlags(self.flags + flag)
}
