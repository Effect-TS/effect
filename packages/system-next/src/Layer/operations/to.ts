import { environment } from "../../Managed/operations/environment"
import type { Erase } from "../../Utils"
import type { Layer } from "../definition"
import { ILayerManaged, ILayerTo } from "../definition"
import { and_ } from "./and"

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 */
export function to_<RIn, E, ROut, RIn2, E2, ROut2>(
  self: Layer<RIn, E, ROut>,
  that: Layer<RIn2, E2, ROut2>
): Layer<RIn & Erase<RIn2, ROut>, E | E2, ROut2>
export function to_<RIn, E, ROut, RIn2, E2, ROut2>(
  self: Layer<RIn, E, ROut>,
  that: Layer<RIn2 & ROut, E2, ROut2>
): Layer<RIn & RIn2, E | E2, ROut2> {
  return new ILayerTo(and_(new ILayerManaged(environment<RIn2>()), self), that)
}

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 *
 * @ets_data_first to_
 */
export function to<RIn2, E2, ROut2>(
  that: Layer<RIn2, E2, ROut2>
): <RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
) => Layer<RIn & Erase<RIn2, ROut>, E | E2, ROut2>
export function to<ROut, RIn2, E2, ROut2>(that: Layer<RIn2 & ROut, E2, ROut2>) {
  return <RIn, E>(self: Layer<RIn, E, ROut>): Layer<RIn & RIn2, E | E2, ROut2> =>
    to_(self, that) as any
}
