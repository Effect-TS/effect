import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckURI, FastCheckType } from "../hkt"

import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraRefined1 } from "@matechs/morphic-alg/refined"

export const fcRefinedInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRefined1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    refined: (getArb, ref, _name, config) => (env) =>
      new FastCheckType(fcApplyConfig(config)(getArb(env).arb.filter(ref), env, {}))
  })
)
