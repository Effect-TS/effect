import { ILayerTo } from "@effect/core/io/Layer/definition"

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 *
 * @tsplus operator ets/Layer >>
 * @tsplud fluent ets/Layer to
 */
export function to_<
  RIn,
  E,
  ROut,
  RIn2,
  E2,
  ROut2
>(
  self: Layer<RIn, E, ROut>,
  that: Layer<RIn2, E2, ROut2>
): Layer<RIn & Erase<RIn2, ROut>, E | E2, ROut2> {
  return Layer.suspend(new ILayerTo(Layer.environment<RIn2>() + self, that))
}

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 *
 * @tsplus static ets/Layer/Aspects to
 */
export const to = Pipeable(to_)
