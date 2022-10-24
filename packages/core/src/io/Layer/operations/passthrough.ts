/**
 * Returns a new layer that produces the outputs of this layer but also
 * passes through the inputs.
 *
 * @tsplus getter effect/core/io/Layer passthrough
 * @category mutations
 * @since 1.0.0
 */
export function passthrough<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
): Layer<RIn, E, RIn | ROut> {
  return Layer.environment<RIn>().merge(self)
}
