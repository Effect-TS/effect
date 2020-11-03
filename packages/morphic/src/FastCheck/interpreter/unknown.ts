import { pipe } from "@effect-ts/core/Function"

import type { UnknownURI } from "../../Algebra/Unknown"
import { interpreter } from "../../HKT"
import { accessFC, FastCheckType, FastCheckURI, fcApplyConfig } from "../base"

export const fcUnknownInterpreter = interpreter<FastCheckURI, UnknownURI>()(() => ({
  _F: FastCheckURI,
  unknown: (configs) => (env) =>
    pipe(
      accessFC(env).anything(),
      (arb) => new FastCheckType(fcApplyConfig(configs?.conf)(arb, env, { arb }))
    )
}))
