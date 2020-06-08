import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import { getEq as RgetEq } from "@matechs/core/Record"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraStrMap1 } from "@matechs/morphic-alg/str-map"

export const eqStrMapInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraStrMap1<EqURI, Env> => ({
    _F: EqURI,
    strMap: (getCodomain, config) => (env) =>
      introduce(getCodomain(env).eq)(
        (eq) => new EqType(eqApplyConfig(config)(RgetEq(eq), env, { eq }))
      )
  })
)
