import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqURI, EqType } from "../hkt"

import type { Eq } from "@matechs/core/Eq"
import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraRefined1 } from "@matechs/morphic-alg/refined"

declare module "@matechs/morphic-alg/refined" {
  interface RefinedConfig<E, A, B> {
    [EqURI]: {
      eq: Eq<A>
    }
  }
}

export const eqRefinedInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRefined1<EqURI, Env> => ({
    _F: EqURI,
    refined: (getEq, _ref, _name, config) => (env) =>
      introduce(getEq(env).eq)(
        (eq) => new EqType(eqApplyConfig(config)(eq, env, { eq }))
      )
  })
)
