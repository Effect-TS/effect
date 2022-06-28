import { ILayerTo } from "@effect/core/io/Layer/definition"

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 *
 * @tsplus pipeable-operator effect/core/io/Layer <<
 * @tsplus static effect/core/io/Layer.Aspects using
 * @tsplus pipeable effect/core/io/Layer using
 */
export function using<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
): <RIn2, E2, ROut2>(that: Layer<RIn2, E2, ROut2>) => Layer<RIn | Erase<RIn2, ROut>, E | E2, ROut2>
export function using<RIn, E, ROut>(self: Layer<RIn, E, ROut>) {
  return <RIn2, E2, ROut2>(that: Layer<RIn2 | ROut, E2, ROut2>): Layer<RIn | RIn2, E | E2, ROut2> =>
    Layer.suspend(
      new ILayerTo(Layer.environment<RIn2>().and(self), that)
    )
}
