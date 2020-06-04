import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqURI, EqType } from "../hkt"

import type { MatechsAlgebraRefined1 } from "@matechs/morphic-alg/refined"

export const eqRefinedInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRefined1<EqURI, Env> => ({
    _F: EqURI,
    refined: (getEq, _ref, _name, config) => (env) =>
      new EqType(eqApplyConfig(config)(getEq(env).eq, env))
  })
)
