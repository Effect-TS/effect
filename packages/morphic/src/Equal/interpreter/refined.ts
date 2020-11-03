import { pipe } from "@effect-ts/core/Function"

import type { RefinedURI } from "../../Algebra/Refined"
import { interpreter } from "../../HKT"
import { eqApplyConfig, EqType, EqURI } from "../base"

export const eqRefinedInterpreter = interpreter<EqURI, RefinedURI>()(() => ({
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
}))
