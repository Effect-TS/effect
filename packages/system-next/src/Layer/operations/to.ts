import type { Erase } from "../../Utils"
import type { Layer } from "../definition"

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 */
export function to_<RIn, E, ROut, RIn2, E2, ROut2>(
  self: Layer<RIn, E, ROut>,
  that: Layer<RIn2, E2, ROut2>
): Layer<RIn & Erase<RIn2, ROut>, E | E2, ROut2> {
  return self[">>>"](that)
}

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 *
 * @ets_data_first to_
 */
export function to<RIn2, E2, ROut2>(that: Layer<RIn2, E2, ROut2>) {
  return <RIn, E, ROut>(
    self: Layer<RIn, E, ROut>
  ): Layer<RIn & Erase<RIn2, ROut>, E | E2, ROut2> => to_(self, that)
}
