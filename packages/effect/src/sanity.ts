/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/sanity.ts
  credits to original author
  small adaptations to extend Monad3E and support contravariance on R
 */

import { raiseAbort, unit } from "waveguide/lib/waver";
import * as T from "./";

/* tested in wave */
/* istanbul ignore next */
export const natNumber = (msg: unknown) => (
  n: number
): T.Effect<T.NoEnv, T.NoErr, void> =>
  n < 0 || Math.round(n) !== n ? raiseAbort(msg) : unit;
