/**
 * Scoped Bun multicast endpoints backed by `node:dgram`, including address reuse
 * for multicast receivers sharing a port.
 * Some Bun versions reject a multicast hop limit of zero; this surfaces as a
 * datagram open error.
 *
 * @since 4.0.0
 */

/**
 * @category re-exports
 * @since 4.0.0
 */
export * from "@effect/platform-node-shared/NodeMulticast"
