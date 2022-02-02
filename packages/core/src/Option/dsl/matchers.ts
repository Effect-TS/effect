// ets_tracing: off

import * as P from "../../Prelude"
import { Covariant } from "../instances/Covariant"

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  P.matchers(Covariant)
