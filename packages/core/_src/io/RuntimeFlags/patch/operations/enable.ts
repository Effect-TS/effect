/**
 * Creates a patch that enables the specified runtime flag.
 *
 * @tsplus static effect/core/io/RuntimeFlags.Patch.Ops enable
 */
export function enable(flag: RuntimeFlags.Flag) {
  return RuntimeFlags.Patch(flag, flag)
}

/**
 * Creates a patch that disables the specified runtime flag.
 *
 * @tsplus static effect/core/io/RuntimeFlags.Patch.Ops disable
 */
export function disable(flag: RuntimeFlags.Flag) {
  return RuntimeFlags.Patch(flag, 0)
}
