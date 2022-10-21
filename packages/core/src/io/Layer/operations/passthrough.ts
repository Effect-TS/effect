/**
 * Returns a new layer that produces the outputs of this layer but also
 * passes through the inputs.
 *
 * @tsplus getter effect/core/io/Layer passthrough
 */
export function passthrough<RIn extends Spreadable, E, ROut extends Spreadable>(
  self: Layer<RIn, E, ROut>
): Layer<RIn, E, RIn | ROut> {
  return Layer.environment<RIn>() + self
}
