// ets_tracing: off

import * as DSL from "../../PreludeV2/DSL/index.js"
import type { OptionF } from "../definitions.js"

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<OptionF>()
