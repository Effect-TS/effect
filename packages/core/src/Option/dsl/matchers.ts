// ets_tracing: off

import * as P from "../../Prelude/index.js"
import { Covariant } from "../instances/Covariant.js"

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  P.matchers(Covariant)
