import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraTaggedUnion1 } from "../../Algebra/tagged-union"
import { collect, memo } from "../../Internal/Utils"
import { accessFC, fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

export const fcTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraTaggedUnion1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    taggedUnion: (_tag, dic, config) => (env) =>
      new FastCheckType(
        pipe(
          collect(dic, (_, getArb) => getArb(env).arb),
          (arbs) =>
            fcApplyConfig(config?.conf)(accessFC(env).oneof(...arbs), env, {
              arbs: arbs as any
            })
        )
      )
  })
)
