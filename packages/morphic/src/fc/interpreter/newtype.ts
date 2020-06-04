import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckURI, FastCheckType } from "../hkt"

import type { MatechsAlgebraNewtype1 } from "@matechs/morphic-alg/newtype"

export const fcNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    newtype: () => (getArb, config) => (env) =>
      new FastCheckType(fcApplyConfig(config)(getArb(env).arb, env))
  })
)
