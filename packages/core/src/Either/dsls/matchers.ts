// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import { Covariant } from "../instances.js"

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers(Covariant)
