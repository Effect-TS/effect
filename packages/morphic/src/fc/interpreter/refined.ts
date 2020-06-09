import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckURI, FastCheckType } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraRefined1 } from "@matechs/morphic-alg/refined"

export const fcRefinedInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRefined1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    refined: (getArb, ref, config) => (env) =>
      introduce(getArb(env).arb)(
        (arb) =>
          new FastCheckType(fcApplyConfig(config?.conf)(arb.filter(ref), env, { arb }))
      ),
    constrained: (getArb, ref, config) => (env) =>
      introduce(getArb(env).arb)(
        (arb) =>
          new FastCheckType(fcApplyConfig(config?.conf)(arb.filter(ref), env, { arb }))
      )
  })
)
