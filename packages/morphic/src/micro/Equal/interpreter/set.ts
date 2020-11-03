import { getEqual as SgetEq } from "@effect-ts/core/Classic/Set"
import { pipe } from "@effect-ts/core/Function"

import type { SetURI } from "../../Algebra/Set"
import { interpreter } from "../../HKT"
import { eqApplyConfig, EqType, EqURI } from "../base"

export const eqSetInterpreter = interpreter<EqURI, SetURI>()(() => ({
  _F: EqURI,
  set: (a, _ord, config) => (env) =>
    pipe(
      a(env).eq,
      (eq) => new EqType(eqApplyConfig(config?.conf)(SgetEq(eq), env, { eq }))
    )
}))
