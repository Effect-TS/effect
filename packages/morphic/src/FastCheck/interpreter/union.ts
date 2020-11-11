import { pipe } from "@effect-ts/core/Function"

import type { UnionURI } from "../../Algebra/Union"
import { interpreter } from "../../HKT"
import { accessFC, FastCheckType, FastCheckURI, fcApplyConfig } from "../base"

export const fcUnionInterpreter = interpreter<FastCheckURI, UnionURI>()(() => ({
  _F: FastCheckURI,
  union: (...dic) => (_, config) => (env) =>
    new FastCheckType(
      pipe(
        dic.map((getArb) => getArb(env).arb),
        (arbs) =>
          fcApplyConfig(config?.conf)(accessFC(env).oneof(...arbs) as any, env, {
            arbs: arbs as any
          })
      )
    )
}))
