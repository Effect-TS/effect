import { ILayerTo } from "@effect/core/io/Layer/definition"

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 *
 * @tsplus pipeable-operator effect/core/io/Layer >>
 * @tsplus static effect/core/io/Layer.Aspects to
 * @tsplus pipeable effect/core/io/Layer to
 */
export function to<RIn2, E2, ROut2>(that: Layer<RIn2, E2, ROut2>) {
  return <RIn, E, ROut>(self: Layer<RIn, E, ROut>): Layer<RIn | Exclude<RIn2, ROut>, E | E2, ROut2> =>
    Layer.suspend(
      new ILayerTo(
        Layer.environment<Exclude<RIn2, ROut>>() + self,
        // @ts-expect-error
        that
      )
    )
}
