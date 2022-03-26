// ets_tracing: off

import type { OptionF } from "@effect-ts/core/Option/definitions"

import * as DSL from "../../PreludeV2/DSL/index.js"

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<OptionF>()
