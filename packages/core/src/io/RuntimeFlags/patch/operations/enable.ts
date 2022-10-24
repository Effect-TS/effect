/**
 * Creates a patch that enables the specified runtime flag.
 *
 * @tsplus static effect/core/io/RuntimeFlags.Patch.Ops enable
 * @category getters
 * @since 1.0.0
 */
export function enable(flag: RuntimeFlags.Flag): RuntimeFlags.Patch {
  return RuntimeFlags.Patch(flag, flag)
}

/**
 * Creates a patch that disables the specified runtime flag.
 *
 * @tsplus static effect/core/io/RuntimeFlags.Patch.Ops disable
 * @category getters
 * @since 1.0.0
 */
export function disable(flag: RuntimeFlags.Flag): RuntimeFlags.Patch {
  return RuntimeFlags.Patch(flag, 0)
}
