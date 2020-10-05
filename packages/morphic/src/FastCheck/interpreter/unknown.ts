import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraUnknown1 } from "../../Algebra/unknown"
import { memo } from "../../Internal/Utils"
import { accessFC, fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

export const fcUnknownInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraUnknown1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    unknown: (configs) => (env) =>
      pipe(
        accessFC(env).anything(),
        (arb) => new FastCheckType(fcApplyConfig(configs?.conf)(arb, env, { arb }))
      )
  })
)
