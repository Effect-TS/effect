import { ILayerTo } from "@effect/core/io/Layer/definition"

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 *
 * @tsplus operator ets/Layer <<
 * @tsplus fluent ets/Layer using
 */
export function using_<
  RIn,
  E,
  ROut,
  RIn2,
  E2,
  ROut2
>(
  that: Layer<RIn2, E2, ROut2>,
  self: Layer<RIn, E, ROut>
): Layer<RIn | Erase<RIn2, ROut>, E | E2, ROut2>
export function using_<
  RIn,
  E,
  ROut,
  RIn2,
  E2,
  ROut2
>(
  that: Layer<RIn2 | ROut, E2, ROut2>,
  self: Layer<RIn, E, ROut>
): Layer<RIn | RIn2, E | E2, ROut2> {
  return Layer.suspend(
    new ILayerTo(Layer.environment<RIn2>().and(self), that)
  )
}

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 *
 * @tsplus static ets/Layer/Aspects using
 */
export const using = Pipeable(using_)
