// ets_tracing: off

import type { OptionF } from "@effect-ts/core/Option/definitions"

import * as P from "../../PreludeV2/index.js"

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  P.matchers<OptionF>()
