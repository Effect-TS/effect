import { anything, Arbitrary } from "fast-check"

import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraUnknown1 } from "@matechs/morphic-alg/unknown"

declare module "@matechs/morphic-alg/unknown" {
  interface UnknownConfig {
    [FastCheckURI]: {
      arb: Arbitrary<unknown>
    }
  }
}

export const fcUnknownInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraUnknown1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    unknown: (configs) => (env) =>
      introduce(anything())(
        (arb) => new FastCheckType(fcApplyConfig(configs)(arb, env, { arb }))
      )
  })
)
