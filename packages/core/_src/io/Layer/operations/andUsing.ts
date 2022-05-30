/**
 * Feeds the output services of this layer into the input of the specified
 * layer, resulting in a new layer with the inputs of this layer, and the
 * outputs of both layers.
 *
 * @tsplus operator ets/Layer <
 * @tsplus fluent ets/Layer andUsing
 */
export function andUsing_<
  RIn,
  E,
  ROut,
  RIn2,
  E2,
  ROut2
>(
  that: Layer<RIn2, E2, ROut2>,
  self: Layer<RIn, E, ROut>
): Layer<RIn & Erase<RIn2, ROut>, E2 | E, ROut & ROut2> {
  return self + (self >> that)
}

/**
 * Feeds the output services of this layer into the input of the specified
 * layer, resulting in a new layer with the inputs of this layer, and the
 * outputs of both layers.
 *
 * @tsplus static ets/Layer/Aspects andUsing
 */
export const andUsing = Pipeable(andUsing_)
