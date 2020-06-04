import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqURI, EqType } from "../hkt"

import type { MatechsAlgebraNewtype1 } from "@matechs/morphic-alg/newtype"

export const eqNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype1<EqURI, Env> => ({
    _F: EqURI,
    newtype: () => (getEq, config) => (env) =>
      new EqType(eqApplyConfig(config)(getEq(env).eq, env))
  })
)
