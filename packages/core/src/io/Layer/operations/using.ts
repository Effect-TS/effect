import type { Erase, Spreadable } from "../../../data/Utils"
import { Effect } from "../../Effect"
import type { Layer } from "../definition"
import { ILayerScoped, ILayerTo } from "../definition"
import { and_ } from "./and"

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
  ROut extends Spreadable,
  RIn2 extends Spreadable,
  E2,
  ROut2 extends Spreadable
>(
  that: Layer<RIn2, E2, ROut2>,
  self: Layer<RIn, E, ROut>
): Layer<RIn & Erase<RIn2, ROut>, E | E2, ROut2>
export function using_<
  RIn,
  E,
  ROut extends Spreadable,
  RIn2 extends Spreadable,
  E2,
  ROut2 extends Spreadable
>(
  that: Layer<RIn2 & ROut, E2, ROut2>,
  self: Layer<RIn, E, ROut>
): Layer<RIn & RIn2, E | E2, ROut2> {
  return new ILayerTo(and_(new ILayerScoped(Effect.environment<RIn2>()), self), that)
}

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 */
export const using = Pipeable(using_)
