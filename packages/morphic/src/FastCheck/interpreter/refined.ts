import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRefined1 } from "../../Algebra/refined"
import { memo } from "../../Internal/Utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

export const fcRefinedInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRefined1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    refined: (getArb, ref, config) => (env) =>
      pipe(
        getArb(env).arb,
        (arb) =>
          new FastCheckType(fcApplyConfig(config?.conf)(arb.filter(ref), env, { arb }))
      ),
    constrained: (getArb, ref, config) => (env) =>
      pipe(
        getArb(env).arb,
        (arb) =>
          new FastCheckType(fcApplyConfig(config?.conf)(arb.filter(ref), env, { arb }))
      )
  })
)
