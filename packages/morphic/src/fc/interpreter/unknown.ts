import type { AnyEnv } from "@morphic-ts/common/lib/config"
import { anything } from "fast-check"

import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import type { MatechsAlgebraUnknown1 } from "@matechs/morphic-alg/unknown"

export const fcUnknownInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraUnknown1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    unknown: (configs) => (env) =>
      new FastCheckType(fcApplyConfig(configs)(anything(), env))
  })
)
