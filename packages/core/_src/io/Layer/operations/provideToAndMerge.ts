/**
 * Feeds the output services of this layer into the input of the specified
 * layer, resulting in a new layer with the inputs of this layer, and the
 * outputs of both layers.
 *
 * @tsplus pipeable-operator effect/core/io/Layer >
 * @tsplus static effect/core/io/Layer.Aspects provideToAndMerge
 * @tsplus pipeable effect/core/io/Layer provideToAndMerge
 */
export function andTo<RIn2, E2, ROut2>(that: Layer<RIn2, E2, ROut2>) {
  return <RIn, E, ROut>(self: Layer<RIn, E, ROut>): Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut | ROut2> =>
    self.merge(self.provideTo(that))
}
