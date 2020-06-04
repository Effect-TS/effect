import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import { getEq as RgetEq } from "@matechs/core/Record"
import type { MatechsAlgebraStrMap1 } from "@matechs/morphic-alg/str-map"

export const eqStrMapInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraStrMap1<EqURI, Env> => ({
    _F: EqURI,
    strMap: (getCodomain, config) => (env) =>
      new EqType(eqApplyConfig(config)(RgetEq(getCodomain(env).eq), env))
  })
)
