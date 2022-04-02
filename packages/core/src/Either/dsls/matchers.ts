// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import type { EitherF } from "../instances.js"

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<EitherF>()
