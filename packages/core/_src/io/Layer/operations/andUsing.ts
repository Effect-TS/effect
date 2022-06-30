/**
 * Feeds the output services of this layer into the input of the specified
 * layer, resulting in a new layer with the inputs of this layer, and the
 * outputs of both layers.
 *
 * @tsplus pipeable-operator effect/core/io/Layer <
 * @tsplus static effect/core/io/Layer.Aspects andUsing
 * @tsplus pipeable effect/core/io/Layer andUsing
 */
export function andUsing<RIn, E, ROut>(self: Layer<RIn, E, ROut>) {
  return <RIn2, E2, ROut2>(that: Layer<RIn2, E2, ROut2>): Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut | ROut2> =>
    self + (self >> that)
}
