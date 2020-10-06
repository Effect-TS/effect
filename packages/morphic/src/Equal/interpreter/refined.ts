import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRefined1 } from "../../Algebra/refined"
import { memo } from "../../Internal/Utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

export const eqRefinedInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRefined1<EqURI, Env> => ({
    _F: EqURI,
    refined: (getEq, _ref, config) => (env) =>
      pipe(
        getEq(env).eq,
        (eq) => new EqType(eqApplyConfig(config?.conf)(eq, env, { eq, eqRefined: eq }))
      ),
    constrained: (getEq, _ref, config) => (env) =>
      pipe(
        getEq(env).eq,
        (eq) => new EqType(eqApplyConfig(config?.conf)(eq, env, { eq }))
      )
  })
)
