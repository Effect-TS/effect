// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import type { OptionF } from "../definitions.js"

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<OptionF>()
